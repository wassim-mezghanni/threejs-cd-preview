import pandas as pd

# Read the edges data
df_edges = pd.read_csv('/Users/wassim/threejs-cd-preview/ressources/Dark_GD_Contest_Edges.csv')

def get_all_paths(df_edges):
    # Create a dictionary to store edges for each node
    edges_dict = {}
    for _, row in df_edges.iterrows():
        source = row['Source']
        target = row['Target']
        if source not in edges_dict:
            edges_dict[source] = []
        edges_dict[source].append(target)
    
    def find_paths(current_node, current_path, all_paths):
        # If current node is already in path, stop to avoid cycles
        if current_node in current_path:
            return
        
        # Add current node to path
        current_path.append(current_node)
        
        # If current node has no outgoing edges, save the path
        if current_node not in edges_dict:
            all_paths.append(current_path.copy())
            current_path.pop()
            return
        
        # Explore all possible next nodes
        for next_node in edges_dict[current_node]:
            find_paths(next_node, current_path, all_paths)
        
        # Remove current node from path before backtracking
        current_path.pop()
    
    # Find all paths starting from each node
    all_paths = []
    for start_node in edges_dict.keys():
        find_paths(start_node, [], all_paths)
    
    return all_paths

# Get all possible paths
all_paths = get_all_paths(df_edges)

# Print results
print("\nAll possible paths (avoiding cycles):")
for i, path in enumerate(all_paths, 1):
    print(f"Path {i}: {' -> '.join(map(str, path))}")
print(f"\nTotal number of paths: {len(all_paths)}")

# Get unique values from Source and Target columns
source_nodes = set(df_edges['Source'])
target_nodes = set(df_edges['Target'])

## Entrypoints
comparison_df = pd.DataFrame({
    'Source': sorted(list(source_nodes)),
    'Is_Target': [node in target_nodes for node in sorted(list(source_nodes))]
})
#show only nodes that are not in Target
source_only_df = comparison_df[~comparison_df['Is_Target']]

print("\nNodes that appear only as Source (not as Target):")
print(source_only_df[['Source']].to_string(index=False))
print(f"\nTotal count: {len(source_only_df)}") 

## Count nodes with degree 2 (one target and one source)
# Count occurrences of each node in Source and Target columns
source_counts = df_edges['Source'].value_counts()
target_counts = df_edges['Target'].value_counts()

all_nodes = pd.DataFrame(index=sorted(set(df_edges['Source'].unique()) | set(df_edges['Target'].unique())))
all_nodes['source_count'] = all_nodes.index.map(lambda x: source_counts.get(x, 0))
all_nodes['target_count'] = all_nodes.index.map(lambda x: target_counts.get(x, 0))
all_nodes['total_degree'] = all_nodes['source_count'] + all_nodes['target_count']

#  nodes with degree 2
degree_2_nodes = all_nodes[all_nodes['total_degree'] == 2]

# only nodes with exactly one source and one target
degree_2_nodes = degree_2_nodes[
    (degree_2_nodes['source_count'] == 1) & 
    (degree_2_nodes['target_count'] == 1)
]

print("\nNodes with exactly one source and one target:")
print(degree_2_nodes[['source_count', 'target_count']].to_string())
print(f"\nTotal count: {len(degree_2_nodes)}")

## High degree nodes : total count is equal or higher than 3 
high_degree_nodes = all_nodes[all_nodes['total_degree'] >= 3]
print("\nHigh degree nodes (degree >= 3):")
print(high_degree_nodes[['source_count', 'target_count', 'total_degree']].to_string())
print(f"\nTotal count: {len(high_degree_nodes)}")








