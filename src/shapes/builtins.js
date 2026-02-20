/**
 * Built-in shapes — registers all default shape types into the ShapeRegistry.
 * Import and call registerBuiltinShapes(services) during bootstrap.
 */
export function registerBuiltinShapes(services) {
  const { shapes } = services;

  shapes.register('rect',     cfg => new Konva.Rect(cfg));
  shapes.register('circle',   cfg => new Konva.Circle(cfg));
  shapes.register('triangle', cfg => new Konva.RegularPolygon({ ...cfg, sides: 3 }));
  shapes.register('pentagon', cfg => new Konva.RegularPolygon({ ...cfg, sides: 5 }));
  shapes.register('hexagon',  cfg => new Konva.RegularPolygon({ ...cfg, sides: 6 }));
  shapes.register('diamond',  cfg => new Konva.RegularPolygon({ ...cfg, sides: 4 }));

  shapes.register('star', cfg =>
    new Konva.Star({
      ...cfg,
      numPoints:   5,
      innerRadius: (cfg.radius || 60) * 0.42,
      outerRadius: cfg.radius || 60,
    })
  );

  shapes.register('arrow', cfg =>
    new Konva.Arrow({
      ...cfg,
      stroke:        cfg.fill,
      fill:          cfg.fill,
      strokeWidth:   3,
      pointerLength: 16,
      pointerWidth:  16,
    })
  );

  shapes.register('line', cfg =>
    new Konva.Line({
      ...cfg,
      stroke:      cfg.fill,
      fill:        null,
      strokeWidth: 4,
      lineCap:     'round',
    })
  );

  shapes.register('cloud', cfg => {
    // Cloud made of overlapping circles using a Path approximation
    return new Konva.Shape({
      ...cfg,
      sceneFunc(ctx, shape) {
        const w = 120, h = 70;
        ctx.beginPath();
        ctx.arc(30, 50, 28, Math.PI, 0, false);
        ctx.arc(55, 30, 32, Math.PI * 1.1, 0, false);
        ctx.arc(85, 40, 25, Math.PI, 0, false);
        ctx.arc(100, 50, 20, Math.PI * 0.8, 0, false);
        ctx.lineTo(125, 70); ctx.lineTo(5, 70);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      },
      width: 130, height: 70,
    });
  });

  shapes.register('heart', cfg =>
    new Konva.Path({
      ...cfg,
      data: 'M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z',
      scale: { x: 4, y: 4 },
      stroke: cfg.stroke || cfg.fill,
    })
  );


  shapes.register('text', cfg =>
    new Konva.Text({
      ...cfg,
      text:        cfg.text || 'Double-click to edit',
      fontSize:    cfg.fontSize || services.drawing.fontSize,
      fontFamily:  "'Kalam', cursive",
      fill:        cfg.fill,
      stroke:      'transparent',
      strokeWidth: 0,
    })
  );
}
