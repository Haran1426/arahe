
import { FRUITS } from "./fruits.js";

// Matter.js 기능 가져오기
var Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    World = Matter.World,
    Body = Matter.Body,
    Sleeping = Matter.Sleeping,
    Events = Matter.Events;

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

// 상단 기준선
const topLine = Bodies.rectangle(310, 150, 620, 2, {
    isStatic: true,
    isSensor: true, // 충돌 감지만 하고 통과 가능
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

// 벽과 바닥 추가
World.add(world, [leftWall, rightWall, floorWall, topLine]);

// 게임 실행
Render.run(render);
Runner.run(engine);

// 현재 과일 정보
let currentBody = null;
let currentFruits = null;

// 키보드 입력 제한
let disableAction = false;

// 랜덤 과일 생성
function addFruits()
{
    // 0~4 사이 랜덤 인덱스
    const index = Math.floor(Math.random() * Math.min(5, FRUITS.length));
    const fruit = FRUITS[index];

    // 과일 물리 객체 생성
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

    // 현재 과일 저장
    currentBody = body;
    currentFruits = fruit;

    // 월드에 과일 추가
    World.add(world, body);
}

// 키보드 입력 처리
window.onkeydown = (event) => {

    // 입력 제한 중이면 종료
    if (disableAction)
    {
        return;
    }

    if (currentBody === null)
    {
        return;
    }

    switch (event.code)
    {
        // A키: 왼쪽 이동
        case "KeyA":
            Body.setPosition(currentBody, {
                x: Math.max(
                    30 + currentFruits.radius,
                    currentBody.position.x - 10
                ),
                y: currentBody.position.y
            });
            break;

        // D키: 오른쪽 이동
        case "KeyD":
            Body.setPosition(currentBody, {
                x: Math.min(
                    590 - currentFruits.radius,
                    currentBody.position.x + 10
                ),
                y: currentBody.position.y
            });
            break;

        // S키: 과일 떨어뜨리기
        case "KeyS":

            // 중복 입력 방지
            disableAction = true;

            // 과일 수면 상태 해제
            Sleeping.set(currentBody, false);

            // 떨어뜨린 과일은 더 이상 조작하지 않음
            currentBody = null;
            currentFruits = null;

            // 1초 후 새로운 과일 생성
            setTimeout(() => {
                addFruits();
                disableAction = false;
            }, 1000);
            break;
    }
};

// 같은 과일 충돌 시 합치기
Events.on(engine, "collisionStart", (event) => {

    event.pairs.forEach((collision) => {

        const bodyA = collision.bodyA;
        const bodyB = collision.bodyB;

        // 과일이 아닌 물체는 제외
        if (typeof bodyA.index !== "number" ||
            typeof bodyB.index !== "number")
        {
            return;
        }

        // 서로 다른 과일이면 합치지 않음
        if (bodyA.index !== bodyB.index)
        {
            return;
        }

        const index = bodyA.index;

        // 다음 단계 과일이 있는지 확인
        if (index + 1 >= FRUITS.length)
        {
            return;
        }

        // 이미 제거된 과일이면 처리하지 않음
        if (!world.bodies.includes(bodyA) ||
            !world.bodies.includes(bodyB))
        {
            return;
        }

        // 충돌 위치 저장
        const x = (bodyA.position.x + bodyB.position.x) / 2;
        const y = (bodyA.position.y + bodyB.position.y) / 2;

        // 기존 과일 2개 제거
        World.remove(world, [bodyA, bodyB]);

        // 다음 단계 과일 정보
        const newFruit = FRUITS[index + 1];

        // 더 큰 과일 생성
        const newBody = Bodies.circle(
            x,
            y,
            newFruit.radius,
            {
                index: index + 1,
                render: {
                    sprite: {
                        texture: `${newFruit.name}.png`
                    }
                },
                restitution: 0.2,
            }
        );

        // 새로운 과일 추가
        World.add(world, newBody);
    });
});

// 최초 과일 생성
addFruits();
