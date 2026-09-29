No 3D model files are required.

The 3D scenes on the Home and Civil & Infrastructure pages are generated
procedurally in js/3d.js using Three.js primitives, so the site stays light
and nothing has to be downloaded or converted.

If real models (.glb / .gltf) are ever added, place them in this folder and
load them with Three.js GLTFLoader from js/3d.js.
