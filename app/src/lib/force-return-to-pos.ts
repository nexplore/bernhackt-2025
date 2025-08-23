/**
 * Create a force, that when active, slowly moves nodes to the position provided by getPosition (similar to forceCenter, not modifying velocities but positions)
 */
export default function<T>(getPosition: (node: T) => { x: number; y: number } | null) {
  var nodes, strength = .1;



  function force() {
    var i,
        n = nodes.length,
        node;


  for (i = 0; i < n; ++i) {
    node = nodes[i];
    const pos = getPosition(node);
      if (pos) {
        const { x, y } = pos;
        node.x -= (node.x - x) * strength;
        node.y -= (node.y - y) * strength;
      }
    }

  }

  force.initialize = function(_) {
    nodes = _;
  };

  return force;
}