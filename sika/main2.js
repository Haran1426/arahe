
import { FRUITS } from "./fruits.js";

// Matter.js에서 사용할 기능 가져오기
var Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    World = Matter.World,
    Body = Matter.Body,
    Events = Matter.Events,
    Sleeping = Matter.Sleeping;

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
const topline = Bodies.rectangle(310, 150, 620, 2, {
    isStatic: true,  // 고정해주는 기능
    isSensor: true,  // 충돌 판정을 끄고 통과 가능하게 함
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

// 벽 배치
World.add(world, [leftWall, rightWall, floorWall, topline]);

// 테스트 실행
Render.run(render);
Runner.run(engine);

// 현재 생성된 과일 정보 저장
let currentBody = null;
let currentFruits = null;

// 키보드 입력 제한
let disableAction = false;

// 랜덤 과일 생성 함수
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
    currentFruits = fruit;

    World.add(world, body);
}

// 키보드 입력 처리
window.onkeydown = (event) => {

    if (disableAction)
    {
        return;
    }

    // 과일이 없으면 실행하지 않음
    if (currentBody === null)
    {
        return;
    }

    switch (event.code)
    {
        // 과일 왼쪽 이동
        case "KeyA":
            Body.setPosition(currentBody, {
                x: currentBody.position.x - 10,
                y: currentBody.position.y
            });
            break;

        // 과일 오른쪽 이동
        case "KeyD":
            Body.setPosition(currentBody, {
                x: currentBody.position.x + 10,
                y: currentBody.position.y
            });
            break;

        // 과일 떨어뜨리기
        case "KeyS":
            Sleeping.set(currentBody, false);
            disableAction = true;

            // 새로운 과일 추가
            setTimeout(() => {
                addFruits();
                disableAction = false;
            }, 1000);
            break;
    }
};

// 같은 과일 충돌 감지
Events.on(engine, "collisionStart", (event) => {

    event.pairs.forEach((collision) => {

        // 과일끼리 충돌했는지 확인
        if (
            typeof collision.bodyA.index !== "number" ||
            typeof collision.bodyB.index !== "number"
        )
        {
            return;
        }

        // 같은 과일끼리 충돌하면 합치기
        if (collision.bodyA.index == collision.bodyB.index)
        {
            const index = collision.bodyA.index;

            // 마지막 과일이면 합치지 않음
            if (index + 1 >= FRUITS.length)
            {
                return;
            }

            // 이미 제거된 과일은 처리하지 않음
            if (
                !world.bodies.includes(collision.bodyA) ||
                !world.bodies.includes(collision.bodyB)
            )
            {
                return;
            }

            // 충돌한 과일 제거
            World.remove(world, [
                collision.bodyA,
                collision.bodyB
            ]);

            // 저장한 index값에 +1을 더해 새로 제작
            const newFruit = FRUITS[index + 1];

            const newBody = Bodies.circle(
                collision.collision.supports[0].x,
                collision.collision.supports[0].y,
                newFruit.radius,
                {
                    // 과일이 합쳐졌으므로 index값 1 증가
                    index: index + 1,

                    // 렌더링 새로 해주기
                    render: {
                        sprite: {
                            texture: `${newFruit.name}.png`
                        }
                    }
                }
            );

            World.add(world, newBody);
        }
    });
});

// 최초 과일 생성
addFruits();
