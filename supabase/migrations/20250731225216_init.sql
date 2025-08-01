CREATE TABLE nodes(
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  CONSTRAINT unique_node_per_parent UNIQUE(parent_id, name)
);

CREATE TABLE node_properties(
  id UUID PRIMARY KEY,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value DECIMAL NOT NULL,
  CONSTRAINT unique_property_name_per_node UNIQUE(node_id, name)
);


CREATE INDEX idx_nodes_parent_id ON nodes(parent_id);

CREATE INDEX idx_nodes_name ON nodes(name);

CREATE INDEX idx_node_properties_node_id ON node_properties(node_id);

CREATE INDEX idx_node_properties_name ON node_properties(name);

CREATE INDEX idx_node_properties_node_name ON node_properties(node_id, name);
