const gameWrapper = document.getElementById('game-wrapper');

var Game = Game || {};
Game.slingshot = () => {
    const Engine = Matter.Engine,
        Render = Matter.Render,
        Runner = Matter.Runner,
        Composite = Matter.Composite,
        Events = Matter.Events,
        Constraint = Matter.Constraint,
        MouseConstraint = Matter.MouseConstraint,
        Mouse = Matter.Mouse,
        World = Matter.World,
        Bodies = Matter.Bodies;
        Body = Matter.Body;
        Bounds = Matter.Bounds;

    // Create engine:
    let engine = Engine.create();

    // Create renderer:
    let render = Render.create({
        element: gameWrapper,
        engine: engine,
        options: {
            width: 800,
            height: 600,
            background: 'transparent',
            wireframeBackground: 'transparent',
            showAngleIndicator: false,
            wireframes: false
        }
    });

    Render.run(render);

    // Create runner:
    let runner = Runner.create();
    Runner.run(runner, engine);

    // Create bodies and other variables:
    const ground = Bodies.rectangle(400, 625, 815, 50, { isStatic: true, render: { visible: false } });

    // This is my work around for adding a static image:
    const slingshot = Bodies.circle(410, 525, 1, {
        isStatic: true,
        render: { 
            sprite: { 
                texture: '../img/slingshot.png',
                xScale: .4,
                yScale: .4
            } 
        } 
    });
    const rockOptions = { 
        density: 0.004,
        restitution: .5,
        label: 'rock',
        render: {
            sprite: {
                texture: '../img/rock.png',
                xScale: .17,
                yScale: .17
            }
        } 
    };
    let rock = Bodies.circle(400, 445, 10, rockOptions);
    const sideElasticRender = {
        lineWidth: 8,
        strokeStyle: '#67000d',
        type: 'line'
    };
    const elastics = {
        // If left and right elastics are used to propel the rock, they will counteract
        // each other, affecting the rock's trajectory. To fix this, I added an invisible 
        // center elastic, which provides the actual driving force.

        // Left and right are just for appearance:
        left: Constraint.create({ 
            pointA: { x: 350, y: 445 }, 
            bodyB: rock, 
            stiffness: 0.0001,
            render: sideElasticRender
        }),
        right: Constraint.create({ 
            pointA: { x: 455, y: 445 }, 
            bodyB: rock, 
            stiffness: 0.0001,
            render: sideElasticRender
        }),
        // Center applies actual force:
        center: Constraint.create({
            pointA: { x: 400, y: 445 },
            bodyB: rock,
            stiffness: 0.01,
            render: {
                strokeStyle: 'transparent'
            }
        }),
    };

    const createBalloonPresent = () => {
        const x = Math.random() * (760 - 40) + 40;
        const y = Math.random() * (300 - 60) + 60;
        const floatDirection = Math.random() > .5 ? 1 : -1;
        
        const balloon = Bodies.circle(x, y, 30, {
            isStatic: true,
            isSensor: true,
            collisionFilter: {group: -1},
            initialPosition: {x: x, y: y}, // custom property necessary for floatBalloon
            floatDirection: floatDirection,
            label: 'balloon',
            render: {
                sprite: {
                    texture: '../img/balloon.png',
                    xScale: .27,
                    yScale: .27
                }
            }
        }),
        present = Bodies.rectangle(x, y + 80, 50, 50, {
            collisionFilter: {group: -1},
            label: 'present',
            render: {
                sprite: {
                    texture: '../img/present.png',
                    xScale: .25,
                    yScale: .25
                }
            }
        }),
        balloonString = Constraint.create({
            bodyA: balloon,
            pointA: {x: -2, y: 29}, 
            bodyB: present,
            pointB: {x: 0, y: -10},
            render: {
                lineWidth: 1,
                strokeStyle: 'black',
                type: 'line'
            }
        });
        return Composite.create({
            bodies: [balloon, present],
            constraints: [balloonString],
            label: 'balloonPresent'
        });
    };
    const balloonPresents = [
        createBalloonPresent(),
        createBalloonPresent(),
        createBalloonPresent()
    ];
    let counterX = -1,
        counterY = -1,
        ticks = 0;

    const floatBalloon = (balloonPresent) => {
        const balloon = balloonPresent.bodies[0];
        let px = balloon.initialPosition.x + 450 * Math.sin(counterX) * balloon.floatDirection,
            py = balloon.initialPosition.y + 10 * Math.sin(counterY) * balloon.floatDirection;

        // Balloon is static so must manually update velocity for friction to work:
        Body.setVelocity(balloon, { x: px - balloon.position.x, y: py - balloon.position.y });
        Body.setPosition(balloon, { x: px, y: py });
    };

    // Sets initial position to avoid present flailing everywhere:
    const initBalloonPresent = (balloonPresent) => {
        floatBalloon(balloonPresent);
        const [balloon, present] = balloonPresent.bodies;
        Body.setPosition(present, { x: balloon.position.x, y: balloon.position.y + 80 });
    };

    // Add bodies:
    balloonPresents.forEach(bP => initBalloonPresent(bP));
    World.add(engine.world, [ground, slingshot, ...balloonPresents, ...Object.values(elastics), rock]);

    // Create event handlers:
    Events.on(engine, 'beforeUpdate', () => {
        counterX += .005;
        counterY += .04;
        ticks++;
        // Manage balloon positions:
        engine.world.composites.filter(c => c.label === 'balloonPresent').forEach(bP => floatBalloon(bP));
    });

    Events.on(engine, 'afterUpdate', () => {
        // Create new rock and re-attach elastics when slingshot is fired:
        if (mouseConstraint.mouse.button === -1 && (rock.position.y < 435)) {
            rock = Bodies.circle(400, 445, 10, rockOptions);
            World.add(engine.world, rock);
            elastics.left.bodyB = rock;
            elastics.right.bodyB = rock;
            elastics.center.bodyB = rock;
        }

        // Every 200 ticks, create new balloonPresent if less than 3 exist:
        if (ticks % 200 === 0 &&
            engine.world.composites.filter(c => c.label === 'balloonPresent').length < 3) {
            const newBalloonPresent = createBalloonPresent();
            initBalloonPresent(newBalloonPresent);
            World.add(engine.world, newBalloonPresent);
        }
    });

    Events.on(engine, 'collisionStart', (event) => {
        const popBalloon = (balloonPresent) => {
            const present = balloonPresent.bodies[1];
            // Remove present from composite:
            Composite.move(balloonPresent, present, engine.world);
            present.collisionFilter.group = 0;
            // Remove composite from world:
            World.remove(engine.world, balloonPresent);
        };

        const getBalloonPresentFromBody = (body) => {
            return engine.world.composites.find(bP => bP.bodies.includes(body));
        };

        event.pairs.forEach(pair => {
            if (getBalloonPresentFromBody(pair.bodyA) && pair.bodyB.label === 'rock') {
                popBalloon(getBalloonPresentFromBody(pair.bodyA));
            } else if (getBalloonPresentFromBody(pair.bodyB) && pair.bodyA.label === 'rock') {
                popBalloon(getBalloonPresentFromBody(pair.bodyB));
            }
        });
    });

    // Add mouse control:
    const mouse = Mouse.create(render.canvas),
        mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: {
                    visible: false
                }
            }
        });
    
    // Open fallen presents on click:
    Events.on(mouseConstraint, 'mouseup', () => {
        const presents = engine.world.bodies.filter(b => b.label === 'present');
        const items = ['30000bells', '1000bells', 'clay', 'iron', 'gold', 'furniture', 'glasses', 'hat', 'shirt', 'dress', 'bottoms', 'socks', 'shoes']
        for (const present of presents) {
            if (Bounds.contains(present.bounds, mouse.position)) {
                const item = items[Math.floor(Math.random() * items.length)];
                present.label = item;
                present.render.sprite.texture = `../img/${item}.png`;
                present.render.sprite.xScale = .6;
                present.render.sprite.yScale = .6;
                break;
            }
        }
    });

    World.add(engine.world, mouseConstraint);

    // Keep the mouse in sync with rendering:
    render.mouse = mouse;

    // Fit the render viewport to the scene:
    Render.lookAt(render, {
        min: { x: 0, y: 0 },
        max: { x: 800, y: 600 }
    });

    // Context:
    return {
        engine: engine,
        runner: runner,
        render: render,
        canvas: render.canvas,
        stop: function() {
            Matter.Render.stop(render);
            Matter.Runner.stop(runner);
        }
    };
};

Game.slingshot.title = 'Slingshot';
Game.slingshot.for = '>=0.14.2';

if (typeof module !== 'undefined') {
    module.exports = Game.slingshot;
}