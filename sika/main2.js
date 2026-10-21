import { FRUITS } from "./fruits.js";

var Engine = Matter.Engine,
    Render= Matter.Render,
    Runner= Matter.Runner,
    Bodies = Matter.Bodies,
    World = Matter.World

const engine = Engine.create();

const world = engine.world;

const leftWall = Bodies.rectangle(15, 395, 30, 790, {
    isStatic : true,
    render: { fillStyle: '#E6B143' }
})

const rightWall = Bodies.rectangle(605, 395, 30, 790, {
    isStatic : true,
    render: { fillStyle: '#E6B143' }
})

const floorWall = Bodies.rectangle(310, 820, 620, 60, {
    isStatic : true,
    render: { fillStyle: '#E6B143' }
})

const topline = Bodies.rectangle(310, 150, 620, 3, {
    isStatic : true,
    isSensor : false, 
    render: { fillStyle: '#E6B143' }
})

const render = Render.create({
    engine,
    element: document.body,
    options:{
        wireframes: false,
        background: '#F7F4C8',
        width: 620,
        height: 850,

    }

})
World.add(world, [leftWall])
World.add(world, [rightWall])
World.add(world, [floorWall])
World.add(world, [topline])

Render.run(render);
Runner.run(engine);



let currentBody = null;
let currentFruits = null;

function addFruits()
{
    const index = Math.floor(Math.random() * 5);
    const fruit = FRUITS[index];

    const body = Bodies.circle(300, 50, fruit.radius, {
        index: index,
        isSleeping: true,
        render: {
            sprite: {
                texture: `${fruit.name}.png`
            }
        },
        restitution: 0.2,
    });

    currentBody = body;
    currentFruits = fruit.index;

    World.add(world, body);
}

addFruits();