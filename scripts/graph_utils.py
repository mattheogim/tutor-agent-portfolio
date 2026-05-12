import argparse
import json
import os
from datetime import datetime

def load_graph(filepath):
    if not os.path.exists(filepath):
        # Create default schema if not exists
        return {
            "nodes": {},
            "edges": [],
            "last_updated": datetime.now().strftime("%Y-%m-%dT%H:%M")
        }
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_graph(filepath, data):
    data["last_updated"] = datetime.now().strftime("%Y-%m-%dT%H:%M")
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def add_node(graph, node_id, label, source, chapter, section, difficulty="medium", error_count=0, star_level=0):
    graph["nodes"][node_id] = {
        "label": label,
        "source": source,
        "chapter": chapter,
        "section": section,
        "difficulty": difficulty,
        "error_count": int(error_count),
        "star_level": int(star_level)
    }

def add_edge(graph, from_node, to_node, type_str, source, weight=1):
    edge = {
        "from": from_node,
        "to": to_node,
        "type": type_str,
        "source": source,
        "weight": int(weight)
    }
    # Check if this exact edge exists
    exists = any(e for e in graph["edges"] if e["from"] == from_node and e["to"] == to_node and e["type"] == type_str)
    if not exists:
        graph["edges"].append(edge)

def update_error(graph, node_id, error_count, star_level):
    if node_id in graph["nodes"]:
        graph["nodes"][node_id]["error_count"] = int(error_count)
        graph["nodes"][node_id]["star_level"] = int(star_level)
    else:
        print(f"Error: Node {node_id} not found.")

def print_stats(graph):
    node_count = len(graph.get("nodes", {}))
    edge_count = len(graph.get("edges", []))
    
    high_risk_nodes = []
    for node_id, data in graph.get("nodes", {}).items():
        if data.get("star_level", 0) >= 1:
            high_risk_nodes.append((node_id, data["star_level"]))
    
    confusion_pairs = []
    for edge in graph.get("edges", []):
        if edge.get("type") == "confused_with":
            confusion_pairs.append((edge["from"], edge["to"]))
            
    print(f"=== Knowledge Graph Stats ===")
    print(f"Nodes: {node_count}")
    print(f"Edges: {edge_count}")
    print(f"\nHigh Risk Nodes (★1+):")
    for n, s in sorted(high_risk_nodes, key=lambda x: x[1], reverse=True)[:5]:
        print(f" - {n} (★{s})")
        
    print(f"\nTop Confusion Pairs:")
    for a, b in confusion_pairs[:5]:
        print(f" - {a} <--> {b}")

def main():
    parser = argparse.ArgumentParser(description="Knowledge Graph Manipulation Utility")
    parser.add_argument("--file", required=True, help="Path to knowledge_graph.json")
    
    subparsers = parser.add_subparsers(dest="command")
    
    # ADD NODE
    node_parser = subparsers.add_parser("add-node")
    node_parser.add_argument("--id", required=True)
    node_parser.add_argument("--label", required=True)
    node_parser.add_argument("--source", required=True)
    node_parser.add_argument("--chapter", required=True)
    node_parser.add_argument("--section", required=True)
    node_parser.add_argument("--difficulty", default="medium")
    node_parser.add_argument("--errors", default=0, type=int)
    node_parser.add_argument("--stars", default=0, type=int)

    # ADD EDGE
    edge_parser = subparsers.add_parser("add-edge")
    edge_parser.add_argument("--from-node", required=True)
    edge_parser.add_argument("--to-node", required=True)
    edge_parser.add_argument("--type", required=True, choices=["prerequisite", "confused_with", "connection_tag", "builds_on"])
    edge_parser.add_argument("--source", required=True)
    edge_parser.add_argument("--weight", default=1, type=int)

    # UPDATE ERROR
    update_parser = subparsers.add_parser("update-error")
    update_parser.add_argument("--id", required=True)
    update_parser.add_argument("--errors", required=True, type=int)
    update_parser.add_argument("--stars", required=True, type=int)
    
    # STATS
    subparsers.add_parser("stats")

    args = parser.parse_args()
    
    graph = load_graph(args.file)
    
    if args.command == "add-node":
        add_node(graph, args.id, args.label, args.source, args.chapter, args.section, args.difficulty, args.errors, args.stars)
        save_graph(args.file, graph)
        print(f"Added/Updated node: {args.id}")
    elif args.command == "add-edge":
        add_edge(graph, args.from_node, args.to_node, args.type, args.source, args.weight)
        save_graph(args.file, graph)
        print(f"Added edge: {args.from_node} -> {args.to_node} ({args.type})")
    elif args.command == "update-error":
        update_error(graph, args.id, args.errors, args.stars)
        save_graph(args.file, graph)
        print(f"Updated error status for: {args.id}")
    elif args.command == "stats":
        print_stats(graph)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
