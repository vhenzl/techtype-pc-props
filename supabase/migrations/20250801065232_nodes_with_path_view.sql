CREATE OR REPLACE RECURSIVE VIEW nodes_with_path (id, name, parent_id, path) AS
SELECT
  id,
  name,
  parent_id,
  '/' || name
FROM nodes
WHERE parent_id IS NULL

UNION ALL

SELECT
  n.id,
  n.name,
  n.parent_id,
  nwp.path || '/' || n.name
FROM nodes n
INNER JOIN nodes_with_path nwp ON n.parent_id = nwp.id
