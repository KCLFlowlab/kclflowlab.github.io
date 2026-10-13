"""Render a qualitative website view from one archived CFD snapshot.

No solver, temporal interpolation, force calculation or source mutation.
The web tracers follow the frozen velocity field, not an unsteady trajectory.
"""
import argparse
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.tri as mtri
from matplotlib.path import Path as MplPath
from matplotlib.colors import LinearSegmentedColormap, Normalize
from scipy.spatial import cKDTree

parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True)
args = parser.parse_args()
out = Path(__file__).resolve().parents[1] / 'site' / 'assets'
with np.load(args.source, allow_pickle=False) as d:
    assert str(d['cell_selection']) == 'calculated'
    x, y = d['x_grid'].copy(), d['y_grid'].copy()
    inside = d['mask_inside'][0].copy()
    bx, by = d['boundary_x'][0].copy(), d['boundary_y'][0].copy()
    phase = float(d['frame_phase'][0])
    selected = (d['raw_cell_frame'] == 0) & (d['raw_cell_cell_type'] == 0)
    points = np.column_stack((d['raw_cell_x'][selected], d['raw_cell_y'][selected]))
    raw = {k: d['raw_cell_'+k][selected].copy() for k in ('u','v','omega')}

# Match the paper's physical cell-selection policy and avoid the archived
# overset-composite raster. Triangles are a spatial display reconstruction only.
boundary = MplPath(np.column_stack((bx, by)))
keep = (~boundary.contains_points(points, radius=1e-10) &
        (points[:,0]>=x[0]) & (points[:,0]<=x[-1]) &
        (points[:,1]>=y[0]) & (points[:,1]<=y[-1]))
points = points[keep]
raw = {k: a[keep] for k,a in raw.items()}
tri = mtri.Triangulation(points[:,0],points[:,1])
vertices = points[tri.triangles]
spacing = cKDTree(points).query(points,k=2)[0][:,1]
edges = np.stack([np.linalg.norm(vertices[:,a]-vertices[:,b],axis=1) for a,b in [(0,1),(1,2),(2,0)]])
tri.set_mask(boundary.contains_points(vertices.mean(axis=1),radius=1e-10) |
             (edges.max(axis=0)>4*np.maximum(spacing[tri.triangles].max(axis=1),1e-12)))
xx,yy=np.meshgrid(x,y)
u,v,omega=[mtri.LinearTriInterpolator(tri,raw[k])(xx,yy).filled(np.nan) for k in ('u','v','omega')]
valid=np.isfinite(u)&np.isfinite(v)&np.isfinite(omega)&~inside

bg = '#071116'
cmap = LinearSegmentedColormap.from_list('flowlab', [
    (0, '#c7f5ed'), (.22, '#62b8c6'), (.43, '#174353'),
    (.5, bg), (.57, '#412c2a'), (.78, '#c77853'), (1, '#ffe2b0')])
field = np.ma.array(omega, mask=~valid)
fig = plt.figure(figsize=(16, 7.7333), dpi=120, facecolor=bg)
ax = fig.add_axes([0, 0, 1, 1], facecolor=bg)
ax.tripcolor(tri, raw['omega'], shading='gouraud', cmap=cmap,
             norm=Normalize(-30,30), edgecolors='none', rasterized=True)
# Spatial contours of the same scalar field, with fixed levels.
ax.tricontour(tri, raw['omega'], levels=[-24, -12, -6, 6, 12, 24],
           colors=['#a0e4e8']*3+['#e9b68a']*3, linewidths=.35, alpha=.44)
velocity_u = np.ma.array(u, mask=~valid)
velocity_v = np.ma.array(v, mask=~valid)
ax.streamplot(x, y, velocity_u, velocity_v, density=(2.8, 1.8),
              color='#aac5c9', linewidth=.27, arrowsize=.25, arrowstyle='-',
              minlength=.06, maxlength=4, integration_direction='both')
ax.fill(bx, by, color=bg, zorder=5)
ax.plot(bx, by, color='#d7eeea', linewidth=.85, zorder=6)
ax.set(xlim=(x[0], x[-1]), ylim=(y[0], y[-1])); ax.axis('off')
fig.savefig(out/'wake-field.png', dpi=120, facecolor=bg)
plt.close(fig)

# A compact, uniformly sampled display grid for browser-side passive tracers.
ix = np.arange(0, len(x), 4); iy = np.arange(0, len(y), 4)
pick = np.ix_(iy, ix)
keep = valid[pick]
def samples(a):
    return np.round(np.where(keep, a[pick], 0), 4).ravel().tolist()
payload = {'nx':len(ix), 'ny':len(iy), 'bounds':[float(x[ix[0]]),float(x[ix[-1]]),float(y[iy[0]]),float(y[iy[-1]])],
           'imageBounds':[float(x[0]),float(x[-1]),float(y[0]),float(y[-1])],
           'phase':phase, 'u':samples(u), 'v':samples(v), 'omega':samples(omega),
           'semantics':'Passive tracers in a frozen phase-0 CFD velocity field; not a time-resolved simulation.'}
(out/'flow-field.json').write_text(json.dumps(payload,separators=(',',':')))
print('Rendered phase',phase,'with calculated cells; original archive unchanged.')
