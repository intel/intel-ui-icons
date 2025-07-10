// This function will be called when the user runs the plugin.
function createTextNodesForStyles() {
    const styles = figma.getLocalPaintStyles();
    let yPos = 0;
  
    styles.forEach(style => {
      // Create a text node for each style
      const textNode = figma.createText();
      textNode.x = 0;
      textNode.y = yPos;
      textNode.characters = `Name: ${style.name}, Value: ${JSON.stringify(style.paints)}`;
      
      // Increment the y position for the next text node
      yPos += textNode.height + 10;
    });
  
    figma.closePlugin(); // Close the plugin when done
  }
  
  // Run the function to create text nodes
  createTextNodesForStyles();
  