
import { FRUITS } from "./fruits.js";

// Matter.js에서 사용할 기능 가져오기
var Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    World = Matter.World,
    Body = Matter.Body;

// 물리 엔진 생성
const engine = Engine.create();
const world = engine.world;

// 왼쪽 벽
const leftWall = Bodies.rectangle(15, 395, 30, 790, {
    isStatic: true,
    render: { fillStyle: '#E6B143' }
});

// 오른쪽 벽
const rightWall = Bodies.rectangle(605, 395, 30, 790, {
    isStatic: true,
    render: { fillStyle: '#E6B143' }
});

// 바닥
const floorWall = Bodies.rectangle(310, 820, 620, 60, {
    isStatic: true,
    render: { fillStyle: '#E6B143' }
});

// 게임 상단 기준선
const topline = Bodies.rectangle(310, 150, 620, 3, {
    isStatic: true,
    isSensor: false,
    render: { fillStyle: '#E6B143' }
});

// 게임 화면 설정
const render = Render.create({
    engine,
    element: document.body,
    options: {
        wireframes: false,
        background: '#F7F4C8',
        width: 620,
        height: 850,
    }
});

// 게임 월드에 벽과 바닥 추가
World.add(world, [leftWall, rightWall, floorWall, topline]);

// 물리 엔진 및 화면 실행
Render.run(render);
Runner.run(engine);

// 현재 생성된 과일 정보 저장
let currentBody = null;
let currentFruits = null;

// 랜덤 과일 생성 함수
function addFruits()
{
    // 0~4 사이의 랜덤 인덱스
    const index = Math.floor(Math.random() * 5);
    const fruit = FRUITS[index];

    // 과일의 물리 객체 생성
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

    // 현재 과일 정보 저장
    currentBody = body;
    currentFruits = fruit;

    // 생성한 과일을 게임에 추가
    World.add(world, body);
}

// 키보드 입력 처리
window.onkeydown = (event) => {

    if (disableAction)
        return;

    // 과일이 없으면 실행하지 않음
    if (currentBody === null)
    {
        return;
    }

    switch (event.code)
    {
        // 과일을 왼쪽으로 10 이동
        case "KeyA":
            Body.setPosition(currentBody, {
                x: currentBody.position.x - 10,
                y: currentBody.position.y
            });
            break;

        // 과일을 오른쪽으로 10 이동
        case "KeyD":
            Body.setPosition(currentBody, {
                x: currentBody.position.x + 10,
                y: currentBody.position.y
            });
            break;

        // 과일 떨어뜨리기
        case "KeyS":
            currentBody.isSleeping = false;
            disableAction = ture;


            // 1초 후 새로운 과일 추가
            setTimeout(() => {
                addFruit();
                disableAction = false;
            }, 1000);
            break;
    }
};

// 최초 과일 생성
addFruits();
