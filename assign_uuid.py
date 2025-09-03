import xml.etree.ElementTree as ET
import uuid
import sys

def assign_uuids_to_nodes(file_path):
    """
    Assigns a unique UUID to each node in the XML file that doesn't already have one.

    Args:
        file_path (str): Path to the XML file.
    """
    try:
        # Parse the XML file
        tree = ET.parse(file_path)
        root = tree.getroot()

        # Recursively assign UUIDs to nodes
        def assign_uuid(node):
            if 'uuid' not in node.attrib:
                node.set('uuid', str(uuid.uuid4()))
            for child in node:
                assign_uuid(child)

        assign_uuid(root)

        # Write the updated XML back to the file
        tree.write(file_path, encoding='utf-8', xml_declaration=True)
        print(f"UUIDs have been successfully assigned to nodes in {file_path}.")

    except ET.ParseError as e:
        print(f"Error parsing XML file: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python assign_uuid.py <path_to_xml_file>")
    else:
        assign_uuids_to_nodes(sys.argv[1])
