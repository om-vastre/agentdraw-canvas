/**
 * Export — exports the canvas as PNG (high-res) or JSON (layer state).
 */
export function createExport(services) {
  function asPNG(filename) {
    const { core, ui } = services;
    const nodes = core.tr.nodes();
    core.tr.nodes([]);
    core.layer.draw();
    const dataURL = core.stage.toDataURL({ pixelRatio: 2 });
    core.tr.nodes(nodes);
    core.layer.draw();
    _download(filename || `agentdraw-canvas-${Date.now()}.png`, dataURL);
    ui.toast('Exported as PNG ✓');
  }

  function asJSON(filename) {
    const { core, ui } = services;
    const json = core.layer.toJSON();
    const blob = new Blob([json], { type: 'application/json' });
    _download(filename || `agentdraw-canvas-${Date.now()}.json`, URL.createObjectURL(blob));
    ui.toast('Exported as JSON ✓');
  }

  function asSVG(filename) {
    const { core, ui } = services;
    const stage = core.stage;
    const layer = core.layer;
    
    // Build SVG content
    const svgWidth = stage.width();
    const svgHeight = stage.height();
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`;
    
    // Convert each shape to SVG
    layer.getChildren().forEach(child => {
      if (child.getClassName() === 'Transformer') return;
      
      const type = child.getClassName();
      const x = child.x();
      const y = child.y();
      const rotation = child.rotation();
      const scaleX = child.scaleX();
      const scaleY = child.scaleY();
      const opacity = child.opacity();
      const fill = child.fill() || 'none';
      const stroke = child.stroke() || 'none';
      const strokeWidth = child.strokeWidth() || 0;
      
      const transform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scaleX}, ${scaleY})`;
      const style = `fill:${fill};stroke:${stroke};stroke-width:${strokeWidth};opacity:${opacity}`;
      
      if (type === 'Circle') {
        const radius = child.radius();
        svgContent += `<circle cx="0" cy="0" r="${radius}" style="${style}" transform="${transform}"/>`;
      } else if (type === 'Rect') {
        const width = child.width();
        const height = child.height();
        svgContent += `<rect x="${-width/2}" y="${-height/2}" width="${width}" height="${height}" style="${style}" transform="${transform}"/>`;
      } else if (type === 'Ellipse') {
        const radiusX = child.radiusX();
        const radiusY = child.radiusY();
        svgContent += `<ellipse cx="0" cy="0" rx="${radiusX}" ry="${radiusY}" style="${style}" transform="${transform}"/>`;
      } else if (type === 'Line') {
        const points = child.points();
        let pathData = '';
        for (let i = 0; i < points.length; i += 2) {
          pathData += (i === 0 ? 'M' : 'L') + points[i] + ',' + points[i+1] + ' ';
        }
        svgContent += `<path d="${pathData}" style="${style}" fill="none" transform="${transform}"/>`;
      } else if (type === 'Arrow') {
        const points = child.points();
        const pointerLength = child.pointerLength() || 10;
        const pointerWidth = child.pointerWidth() || 10;
        
        // Create line path
        let pathData = '';
        for (let i = 0; i < points.length; i += 2) {
          pathData += (i === 0 ? 'M' : 'L') + points[i] + ',' + points[i+1] + ' ';
        }
        
        // Calculate arrow head at the end
        if (points.length >= 4) {
          const lastIdx = points.length - 2;
          const x2 = points[lastIdx];
          const y2 = points[lastIdx + 1];
          const x1 = points[lastIdx - 2];
          const y1 = points[lastIdx - 1];
          const angle = Math.atan2(y2 - y1, x2 - x1);
          
          // Arrow head triangle
          const arrowTip = `${x2},${y2}`;
          const arrowLeft = `${x2 - pointerLength * Math.cos(angle - Math.PI / 6)},${y2 - pointerLength * Math.sin(angle - Math.PI / 6)}`;
          const arrowRight = `${x2 - pointerLength * Math.cos(angle + Math.PI / 6)},${y2 - pointerLength * Math.sin(angle + Math.PI / 6)}`;
          
          svgContent += `<g transform="${transform}">`;
          svgContent += `<path d="${pathData}" style="${style}" fill="none"/>`;
          svgContent += `<polygon points="${arrowTip} ${arrowLeft} ${arrowRight}" style="${style}"/>`;
          svgContent += `</g>`;
        } else {
          svgContent += `<path d="${pathData}" style="${style}" fill="none" transform="${transform}"/>`;
        }
      } else if (type === 'Text') {
        const text = child.text();
        const fontSize = child.fontSize();
        const fontFamily = child.fontFamily() || 'sans-serif';
        svgContent += `<text x="0" y="0" font-size="${fontSize}" font-family="${fontFamily}" style="${style}" transform="${transform}">${text}</text>`;
      } else if (type === 'Star') {
        const innerRadius = child.innerRadius();
        const outerRadius = child.outerRadius();
        const numPoints = child.numPoints();
        let points = '';
        for (let i = 0; i < numPoints * 2; i++) {
          const angle = (i * Math.PI) / numPoints;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const px = radius * Math.sin(angle);
          const py = -radius * Math.cos(angle);
          points += `${px},${py} `;
        }
        svgContent += `<polygon points="${points}" style="${style}" transform="${transform}"/>`;
      } else if (type === 'RegularPolygon') {
        const sides = child.sides();
        const radius = child.radius();
        let points = '';
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
          const px = radius * Math.cos(angle);
          const py = radius * Math.sin(angle);
          points += `${px},${py} `;
        }
        svgContent += `<polygon points="${points}" style="${style}" transform="${transform}"/>`;
      } else if (type === 'Path') {
        const data = child.data();
        const pathScale = child.scale();
        // Apply path's own scale to the transform
        const combinedTransform = `translate(${x}, ${y}) rotate(${rotation}) scale(${scaleX * (pathScale?.x || 1)}, ${scaleY * (pathScale?.y || 1)})`;
        svgContent += `<path d="${data}" style="${style}" transform="${combinedTransform}"/>`;
      } else if (type === 'Group') {
        // Handle sticky notes (groups)
        svgContent += `<g transform="${transform}" style="opacity:${opacity}">`;
        child.getChildren().forEach(groupChild => {
          if (groupChild.getClassName() === 'Rect') {
            const width = groupChild.width();
            const height = groupChild.height();
            const gFill = groupChild.fill();
            const gStroke = groupChild.stroke() || 'none';
            svgContent += `<rect x="0" y="0" width="${width}" height="${height}" style="fill:${gFill};stroke:${gStroke};stroke-width:1" rx="4"/>`;
          } else if (groupChild.getClassName() === 'Text') {
            const gText = groupChild.text();
            const gFontSize = groupChild.fontSize();
            const gX = groupChild.x();
            const gY = groupChild.y();
            svgContent += `<text x="${gX}" y="${gY + gFontSize}" font-size="${gFontSize}" style="fill:#333">${gText}</text>`;
          }
        });
        svgContent += `</g>`;
      } else if (type === 'Image') {
        const width = child.width();
        const height = child.height();
        const image = child.image();
        if (image && image.src) {
          svgContent += `<image x="${-width/2}" y="${-height/2}" width="${width}" height="${height}" href="${image.src}" transform="${transform}" style="opacity:${opacity}"/>`;
        }
      } else if (type === 'Shape') {
        // Custom shapes with sceneFunc - convert to image
        try {
          const bbox = child.getClientRect();
          const dataURL = child.toDataURL({ pixelRatio: 2 });
          svgContent += `<image x="${-bbox.width/2}" y="${-bbox.height/2}" width="${bbox.width}" height="${bbox.height}" href="${dataURL}" transform="${transform}" style="opacity:${opacity}"/>`;
        } catch (e) {
          console.warn('[SVG Export] Could not export custom shape:', e);
        }
      }
    });
    
    svgContent += '</svg>';
    
    // Create blob and download
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    _download(filename || `agentdraw-canvas-${Date.now()}.svg`, URL.createObjectURL(blob));
    ui.toast('Exported as SVG ✓');
  }

  function _download(filename, href) {
    const a  = document.createElement('a');
    a.download = filename;
    a.href = href;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ── Agent-ready API ──────────────────────────────────────────────────

  function getState() {
    const layer = services.core.layer;
    const shapes = [];
    
    layer.getChildren().forEach(child => {
      if (child.getClassName() === 'Transformer') return;
      if (child.name() === 'watermark') return;  // Exclude watermark
      
      const attrs = child.getAttrs();
      const shapeData = {
        id: child._publicId || null,
        type: child.getClassName(),
        x: child.x(),
        y: child.y(),
        rotation: child.rotation(),
        scaleX: child.scaleX(),
        scaleY: child.scaleY(),
        opacity: child.opacity(),
        fill: attrs.fill,
        stroke: attrs.stroke,
        strokeWidth: attrs.strokeWidth,
      };
      
      // Add type-specific properties
      if (attrs.width !== undefined) shapeData.width = attrs.width;
      if (attrs.height !== undefined) shapeData.height = attrs.height;
      if (attrs.radius !== undefined) shapeData.radius = attrs.radius;
      if (attrs.text !== undefined) shapeData.text = attrs.text;
      if (attrs.fontSize !== undefined) shapeData.fontSize = attrs.fontSize;
      if (attrs.points !== undefined) shapeData.points = attrs.points;
      
      shapes.push(shapeData);
    });
    
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      shapeCount: shapes.length,
      shapes,
    };
  }

  function loadState(json) {
    if (!json || !json.shapes || !Array.isArray(json.shapes)) {
      console.error('[Export] Invalid state format');
      return false;
    }
    
    
    services.animations.stopAll(true);  // Silent
    services.core.layer.destroyChildren();
    if (services.core.watermark) services.core.layer.add(services.core.watermark);
    services.core.layer.add(services.core.tr);
    services.interaction.deselect();
    
    // Recreate shapes from state
    json.shapes.forEach(item => {
      if (!item.type || !item.id) return;
      
      const config = {
        x: item.x,
        y: item.y,
        rotation: item.rotation || 0,
        scaleX: item.scaleX || 1,
        scaleY: item.scaleY || 1,
        opacity: item.opacity !== undefined ? item.opacity : 1,
        fill: item.fill,
        stroke: item.stroke,
        strokeWidth: item.strokeWidth,
      };
      
      // Add type-specific properties
      if (item.width !== undefined) config.width = item.width;
      if (item.height !== undefined) config.height = item.height;
      if (item.radius !== undefined) config.radius = item.radius;
      if (item.text !== undefined) config.text = item.text;
      if (item.fontSize !== undefined) config.fontSize = item.fontSize;
      if (item.points !== undefined) config.points = item.points;
      
      // Suppress entrance animation by setting opacity to final value
      const shape = services.shapes.create(item.type.toLowerCase(), config);
      if (shape) {
        if (item.id && shape._publicId) {
          services.shapes.shapeMap.delete(shape._publicId);
          shape._publicId = item.id;
          services.shapes.shapeMap.set(item.id, shape);
        }
        shape.opacity(config.opacity);
        shape.scaleX(config.scaleX);
        shape.scaleY(config.scaleY);
      }
    });
    
    
    if (services.core.watermark) services.core.watermark.moveToTop();
    services.core.layer.batchDraw();
    services.events.emit('stats:update');
    services.history.save();
    services.ui.toast(`Loaded ${json.shapes.length} shapes`, 2000);
    return true;
  }

  return { asPNG, asJSON, asSVG, getState, loadState };
}
