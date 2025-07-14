function findUnderlayerComponent(): ComponentNode | null {
  const componentsPage = figma.root.findChild(
    (page) => page.name === "Components"
  );
  if (componentsPage) {
    return findNodeInPage("underlayer", componentsPage);
  }
  return null;
}

function findNodeInPage(name: string, node: BaseNode): ComponentNode | null {
  if (node.name === name && node.type === "COMPONENT") {
    return node as ComponentNode;
  }
  if ("children" in node) {
    for (const child of node.children) {
      const found = findNodeInPage(name, child);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function getComponentSets(node: BaseNode): BaseNode[] {
  let componentSets: BaseNode[] = [];
  if (node.type === "COMPONENT_SET") {
    componentSets.push(node);
  }
  if ("children" in node) {
    for (const child of node.children) {
      componentSets = componentSets.concat(getComponentSets(child));
    }
  }
  return componentSets;
}

async function updateText(node: TextNode, newText: string) {
  await figma.loadFontAsync(node.fontName as FontName);
  node.characters = newText;
}

function findTextNode(node: BaseNode, nodeName: string): TextNode | null {
  if (node.type === "TEXT" && node.name === nodeName) {
    return node as TextNode;
  }
  if ("children" in node) {
    for (const child of node.children) {
      const found = findTextNode(child, nodeName);
      if (found) return found;
    }
  }
  return null;
}

function findInstanceNode(
  node: BaseNode,
  instanceName: string
): InstanceNode | null {
  if (node.type === "INSTANCE" && node.name === instanceName) {
    return node as InstanceNode;
  }
  if ("children" in node) {
    for (const child of node.children) {
      const found = findInstanceNode(child, instanceName);
      if (found) return found;
    }
  }
  return null;
}

function findVariantWithFontWeight(
  node: BaseNode,
  fontWeight: string
): ComponentNode | null {
  if (
    node.type === "COMPONENT" &&
    node.variantProperties &&
    node.variantProperties["font-weight"] === fontWeight
  ) {
    return node as ComponentNode;
  }
  if ("children" in node) {
    for (const child of node.children) {
      const found = findVariantWithFontWeight(child, fontWeight);
      if (found) return found;
    }
  }
  return null;
}

async function processComponentSets() {
  try {
    // Load fonts outside of the loop
    await Promise.all([
      figma.loadFontAsync({ family: "Inter", style: "Regular" }),
      figma.loadFontAsync({ family: "IntelOne Text", style: "Regular" }),
    ]);

    const underlayerComponent = findUnderlayerComponent();
    if (!underlayerComponent) {
      console.error("Underlayer component not found.");
      figma.closePlugin();
      return;
    }

    let parentFrame = figma.createFrame();
    parentFrame.name = "All Groups";
    parentFrame.layoutMode = "HORIZONTAL";
    parentFrame.primaryAxisSizingMode = "AUTO";
    parentFrame.counterAxisSizingMode = "AUTO";
    parentFrame.counterAxisAlignItems = "MIN";
    parentFrame.itemSpacing = 100;
    parentFrame.fills = []; // Remove fill color
    parentFrame.layoutWrap = "WRAP";
    parentFrame.counterAxisSpacing = 200;
    parentFrame.resize(5000, parentFrame.height); // Keep the current height
    figma.currentPage.appendChild(parentFrame);

    let groupMap: { [key: string]: FrameNode } = {};

    for (const componentSet of allComponentSets) {
      const parentName = componentSet.parent
        ? componentSet.parent.name
        : "Others";
      if (!groupMap[parentName]) {
        let frame = figma.createFrame();
        frame.name = parentName;
        frame.layoutMode = "HORIZONTAL";
        frame.primaryAxisSizingMode = "AUTO";
        frame.counterAxisSizingMode = "AUTO";
        frame.itemSpacing = 24;
        frame.fills = []; // Remove fill color
        parentFrame.appendChild(frame); // Appending the frame after setting its properties
        // Resize the frame to have a width of 1600px
        frame.resize(1600, frame.height); // Keep the current height
        groupMap[parentName] = frame;
      }

      const instance = underlayerComponent.createInstance();
      instance.name = componentSet.name; // Rename the instance to the name of the component set
      groupMap[parentName].appendChild(instance);

      const iconNameTextNode = findTextNode(instance, "Icon Name");
      if (iconNameTextNode) {
        await updateText(iconNameTextNode, componentSet.name);
      } else {
        console.log("Icon Name text node not found in the instance.");
      }

      const lightVariant = findVariantWithFontWeight(componentSet, "Light");
      const regVariant = findVariantWithFontWeight(componentSet, "Regular");
      const solidVariant = findVariantWithFontWeight(componentSet, "Solid");

      const lightInstance = findInstanceNode(instance, "lightInstance");
      const solidInstance = findInstanceNode(instance, "solidInstance");
      const regInstance = findInstanceNode(instance, "regInstance");
      const bigInstanceInUnderlayer = findInstanceNode(instance, "bigInstance");

      if (lightVariant && lightInstance) {
        lightInstance.swapComponent(lightVariant);
        lightInstance.visible = true;
      } else if (lightInstance) {
        lightInstance.visible = false;
      }

      if (regVariant && regInstance) {
        regInstance.swapComponent(regVariant);
        regInstance.visible = true;
      } else if (regInstance) {
        regInstance.visible = false;
      }

      if (solidVariant && solidInstance) {
        solidInstance.swapComponent(solidVariant);
        solidInstance.visible = true;
      } else if (solidInstance) {
        solidInstance.visible = false;
      }

      if (lightVariant && bigInstanceInUnderlayer) {
        bigInstanceInUnderlayer.swapComponent(lightVariant);
      } else if (regVariant && bigInstanceInUnderlayer) {
        bigInstanceInUnderlayer.swapComponent(regVariant);
      } else if (solidVariant && bigInstanceInUnderlayer) {
        bigInstanceInUnderlayer.swapComponent(solidVariant);
      }
    }
    for (const parentName in groupMap) {
      const frame = groupMap[parentName];
      const iconCount = frame.children.length;

      let textNode = figma.createText();
      textNode.characters = `${parentName} (${iconCount} icons)`;
      textNode.fontSize = 24;
      textNode.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
      textNode.resize(1600, textNode.height); // Set the width of the text label to 1600px
      frame.insertChild(0, textNode);
      frame.layoutWrap = "WRAP";
      frame.counterAxisSpacing = 48;
    }

    // Sorting the child frames based on the number of icons in each group
    const sortedFrames = [...parentFrame.children].filter(
      (node) => "children" in node
    ) as Array<FrameNode>;
    sortedFrames.sort((a, b) => {
      return b.children.length - a.children.length;
    });
    sortedFrames.forEach((frame) => {
      parentFrame.appendChild(frame);
    });
  } catch (error) {
    console.error("Error in processComponentSets:", error);
  }
}

const componentsPage = figma.root.findChild(
  (page) => page.type === "PAGE" && page.name === "Components"
) as PageNode;
if (!componentsPage) {
  console.log("No 'Components' page found.");
  figma.closePlugin();
}
const allComponentSets = getComponentSets(componentsPage);
processComponentSets().then(() => figma.closePlugin());
