
import { FRUITS } from "./fruits.js";

// Matter.js 로딩 확인
if (!window.Matter)
{
    throw new Error("Matter.js 로딩 실패");
}

console.log("게임 실행 시작");
console.log("Matter.js 버전:", Matter.version);
console.log("과일 데이터:", FRUITS);

// Matter.js에서 사용할 기능 가져오기
var Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    World = Matter.World,
    Body = Matter.Body,
    Events = Matter.Events,
    Sleeping = Matter.Sleeping;

// 게임 설정
const WIDTH = 620;
const HEIGHT = 850;
const DANGER_LINE = 150;
const MOVE_SPEED = 6;

// 물리 엔진 생성
const engine = Engine.create({
    enableSleeping: true
});

const world = engine.world;

// 중력 설정
engine.gravity.y = 1.2;

// HTML 요소 가져오기
const board = document.getElementById("board");
const message = document.getElementById("message");
const status = document.getElementById("status");

// 게임 화면 확인
if (!board)
{
    throw new Error("main.html에 board 요소가 없습니다.");
}

// 왼쪽 벽
const leftWall = Bodies.rectangle(15, 425, 30, 850, {
    isStatic: true,
    render: {
        fillStyle: "#547c5b"
    }
});

// 오른쪽 벽
const rightWall = Bodies.rectangle(605, 425, 30, 850, {
    isStatic: true,
    render: {
        fillStyle: "#547c5b"
    }
});

// 바닥
const floorWall = Bodies.rectangle(310, 820, 620, 60, {
    isStatic: true,
    render: {
        fillStyle: "#547c5b"
    }
});

// 위험선
const topline = Bodies.rectangle(310, DANGER_LINE, 620, 2, {
    isStatic: true,
    isSensor: true,
    render: {
        visible: false
    }
});

// 게임 화면 설정
const render = Render.create({
    engine: engine,
    element: board,
    options: {
        wireframes: false,
        background: "#192c25",
        width: WIDTH,
        height: HEIGHT,
        showSleeping: false
    }
});

// 벽 배치
World.add(world, [
    leftWall,
    rightWall,
    floorWall,
    topline
]);

// 물리 엔진 실행 준비
const runner = Runner.create();

// 현재 과일
let currentBody = null;
let currentFruits = null;

// 다음 과일
let nextIndex = randomFruit();

// 키보드 입력 제한
let disableAction = false;

// 이동 상태
let leftPressed = false;
let rightPressed = false;
let moveVelocity = 0;

// 점수
let score = 0;
let best = 0;

// 콤보
let combo = 1;
let lastMergeTime = -Infinity;

// 보관 과일
let savedFruit = null;
let holdUsed = false;

// 흔들기 에너지
let energy = 0;

// 게임 상태
let gameOver = false;
let paused = false;

// 과일 생성 시간
let spawnDelay = 0;

// 위험선 초과 시간
let dangerTime = 0;

// 알림 타이머
let messageTimer = null;

// 합체 목록
let mergeQueue = [];

// 중복 합체 방지
const mergingBodies = new Set();

// 파티클 및 점수 이펙트
let particles = [];
let floatingTexts = [];

// 효과음
let audioContext = null;

// 파티클 색상
const colors = [
    "#ff476f",
    "#ff758f",
    "#a78bfa",
    "#f59e0b",
    "#fb923c",
    "#ef4444",
    "#bef264",
    "#f9a8d4",
    "#fde047",
    "#86efac",
    "#22c55e"
];

// 최고 점수 불러오기
try
{
    best = Number(
        localStorage.getItem("juicyLabBest")
    ) || 0;
}
catch (error)
{
    best = 0;
}

// 랜덤 과일 인덱스
function randomFruit()
{
    return Math.floor(
        Math.random() * Math.min(5, FRUITS.length)
    );
}

// 기존 과일 이미지 경로
function fruitTexture(index)
{
    return new URL(
        FRUITS[index].name + ".png",
        import.meta.url
    ).href;
}

// 효과음 활성화
function unlockAudio()
{
    try
    {
        const AudioClass =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioClass)
        {
            return;
        }

        if (!audioContext)
        {
            audioContext = new AudioClass();
        }

        audioContext.resume().catch(() => {});
    }
    catch (error)
    {
        // 효과음을 지원하지 않으면 무시
    }
}

// 효과음 재생
function playSound(frequency, duration = 0.12)
{
    if (!audioContext ||
        audioContext.state !== "running")
    {
        return;
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(
        0.08,
        audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();

    oscillator.stop(
        audioContext.currentTime + duration
    );
}

window.addEventListener("keydown", unlockAudio, {
    once: true
});

window.addEventListener("pointerdown", unlockAudio, {
    once: true
});

// 게임 정보 업데이트
function updateUI()
{
    document.getElementById("score").textContent =
        score.toLocaleString();

    document.getElementById("best").textContent =
        best.toLocaleString();

    document.getElementById("combo").textContent =
        "x" + combo;

    document.getElementById("energy-text").textContent =
        energy + "%";

    document.getElementById("energy-bar").style.width =
        energy + "%";

    document.getElementById("next-fruit").src =
        fruitTexture(nextIndex);

    const holdPreview =
        document.getElementById("hold-preview");

    holdPreview.innerHTML = "";

    // 보관 과일 표시
    if (savedFruit === null)
    {
        holdPreview.innerHTML = "<span>EMPTY</span>";
    }
    else
    {
        const img = document.createElement("img");

        img.src = fruitTexture(savedFruit);
        img.alt = FRUITS[savedFruit].name;

        holdPreview.appendChild(img);
    }

    document.getElementById("drop").disabled =
        disableAction || gameOver || paused;

    document.getElementById("hold").disabled =
        holdUsed || disableAction || gameOver || paused;

    document.getElementById("shake").disabled =
        energy < 100 || gameOver || paused;

    document.getElementById("pause").textContent =
        paused ? "계속하기 P" : "일시정지 P";
}

// 화면 알림
function showMessage(text, duration = 1000)
{
    clearTimeout(messageTimer);

    message.textContent = text;

    if (duration > 0)
    {
        messageTimer = setTimeout(() => {

            message.textContent = "";

        }, duration);
    }
}

// 과일 진화 목록
function showEvolution()
{
    const evolution =
        document.getElementById("evolution");

    evolution.innerHTML = "";

    FRUITS.forEach((fruit, index) => {

        const img = document.createElement("img");

        img.src = fruitTexture(index);
        img.title = fruit.name;

        evolution.appendChild(img);

        if (index < FRUITS.length - 1)
        {
            const arrow = document.createElement("span");

            arrow.textContent = "›";

            evolution.appendChild(arrow);
        }
    });
}

// 과일 물리 객체 생성
function createFruit(index, x, y, waiting = false)
{
    const fruit = FRUITS[index];

    // 좌우 벽 범위 제한
    x = Math.max(
        30 + fruit.radius,
        Math.min(590 - fruit.radius, x)
    );

    const body = Bodies.circle(
        x,
        y,
        fruit.radius,
        {
            index: index,

            // 조작 중에는 움직이지 않음
            isStatic: waiting,

            // 조작 중에는 충돌하지 않음
            isSensor: waiting,

            collisionFilter: {
                category: 0x0001,
                mask: waiting ? 0 : 0xFFFFFFFF
            },

            restitution: 0.2,
            friction: 0.3,
            frictionAir: 0.008,

            render: {
                sprite: {
                    texture: fruitTexture(index),
                    xScale: 1,
                    yScale: 1
                }
            }
        }
    );

    World.add(world, body);

    return body;
}

// 랜덤 과일 생성
function addFruits(index = null, x = 310)
{
    if (gameOver)
    {
        return;
    }

    // 다음 과일 가져오기
    if (index === null)
    {
        index = nextIndex;
        nextIndex = randomFruit();
    }

    const fruit = FRUITS[index];

    currentBody = createFruit(
        index,
        x,
        Math.max(60, fruit.radius + 10),
        true
    );

    currentFruits = fruit;

    disableAction = false;

    updateUI();
}

// 과일 위치 변경
function setFruitPosition(x)
{
    if (!currentBody ||
        disableAction ||
        gameOver ||
        paused)
    {
        return;
    }

    const minX = 30 + currentFruits.radius;
    const maxX = 590 - currentFruits.radius;

    Body.setPosition(currentBody, {
        x: Math.max(minX, Math.min(maxX, x)),
        y: currentBody.position.y
    });
}

// 이동 정지
function stopMove()
{
    leftPressed = false;
    rightPressed = false;
    moveVelocity = 0;
}

// 과일 떨어뜨리기
function dropFruit()
{
    if (disableAction ||
        gameOver ||
        paused ||
        !currentBody)
    {
        return;
    }

    stopMove();

    disableAction = true;

    // 고정 상태 해제
    Body.setStatic(currentBody, false);

    // 충돌 활성화
    currentBody.isSensor = false;

    currentBody.collisionFilter.mask = 0xFFFFFFFF;

    // 과일 수면 상태 해제
    Sleeping.set(currentBody, false);

    // 떨어뜨린 시간 기록
    currentBody.droppedAt = engine.timing.timestamp;

    currentBody = null;
    currentFruits = null;

    holdUsed = false;

    // 0.7초 후 다음 과일 생성
    spawnDelay = 700;

    playSound(250);

    updateUI();
}

// 과일 보관 기능
function holdFruit()
{
    if (disableAction ||
        paused ||
        gameOver ||
        holdUsed ||
        !currentBody)
    {
        return;
    }

    stopMove();

    const index = currentBody.index;
    const x = currentBody.position.x;

    World.remove(world, currentBody);

    currentBody = null;
    currentFruits = null;

    // 처음 과일을 보관하는 경우
    if (savedFruit === null)
    {
        savedFruit = index;

        addFruits(null, x);
    }
    else
    {
        // 보관한 과일과 교환
        const oldIndex = savedFruit;

        savedFruit = index;

        addFruits(oldIndex, x);
    }

    // 한 번 떨어뜨릴 때까지 재사용 금지
    holdUsed = true;

    showMessage("HOLD!", 500);

    playSound(520);

    updateUI();
}

// 흔들기 특수 능력
function shakeFruits()
{
    if (energy < 100 || paused || gameOver)
    {
        return;
    }

    energy = 0;

    world.bodies.forEach((body) => {

        // 벽과 바닥 제외
        if (typeof body.index !== "number")
        {
            return;
        }

        // 현재 조작 중인 과일 제외
        if (body === currentBody)
        {
            return;
        }

        Sleeping.set(body, false);

        Body.setVelocity(body, {
            x: (Math.random() - 0.5) * 12,
            y: -4 - Math.random() * 5
        });

        Body.setAngularVelocity(
            body,
            (Math.random() - 0.5) * 0.2
        );
    });

    // 게임 화면 흔들림
    board.animate(
        [
            { transform: "translateX(0px)" },
            { transform: "translateX(-8px)" },
            { transform: "translateX(8px)" },
            { transform: "translateX(-4px)" },
            { transform: "translateX(4px)" },
            { transform: "translateX(0px)" }
        ],
        {
            duration: 400
        }
    );

    showMessage("SHAKE!", 800);

    playSound(180, 0.3);

    updateUI();
}

// 합체 파티클 생성
function createParticles(x, y, index)
{
    for (let i = 0; i < 20; i++)
    {
        const angle =
            Math.random() * Math.PI * 2;

        const speed =
            2 + Math.random() * 5;

        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 2 + Math.random() * 4,
            color: colors[index % colors.length],
            life: 1
        });
    }
}

// 일시정지
function togglePause()
{
    if (gameOver)
    {
        return;
    }

    paused = !paused;

    stopMove();

    runner.enabled = !paused;

    if (paused)
    {
        showMessage("PAUSED", 0);
    }
    else
    {
        showMessage("");
    }

    updateUI();
}

// 게임 종료
function endGame(win = false)
{
    if (gameOver)
    {
        return;
    }

    gameOver = true;

    disableAction = true;

    stopMove();

    runner.enabled = false;

    if (win)
    {
        showMessage(
            "MISSION COMPLETE!\n수박 제작 성공!\n점수: " + score,
            0
        );

        status.textContent = "YOU WIN!";

        playSound(880, 0.5);
    }
    else
    {
        showMessage(
            "GAME OVER\n최종 점수: " + score + "\nR키로 다시 시작",
            0
        );

        status.textContent = "GAME OVER";

        playSound(130, 0.5);
    }

    updateUI();
}

// 게임 재시작
function restartGame()
{
    stopMove();

    // 기존 과일 제거
    const bodies = [...world.bodies];

    bodies.forEach((body) => {

        if (typeof body.index === "number")
        {
            World.remove(world, body);
        }
    });

    // 충돌 정보 초기화
    Engine.clear(engine);

    currentBody = null;
    currentFruits = null;

    score = 0;
    combo = 1;
    energy = 0;

    savedFruit = null;
    holdUsed = false;

    lastMergeTime = -Infinity;

    dangerTime = 0;
    spawnDelay = 0;

    gameOver = false;
    paused = false;
    disableAction = false;

    particles = [];
    floatingTexts = [];

    mergeQueue = [];
    mergingBodies.clear();

    nextIndex = randomFruit();

    runner.enabled = true;

    showMessage("");

    status.textContent = "READY TO MERGE";
    status.style.color = "#a6e775";

    addFruits();

    updateUI();
}

// 키보드 입력 처리
window.onkeydown = (event) => {

    // 다시 시작
    if (event.code === "KeyR")
    {
        if (!event.repeat)
        {
            restartGame();
        }

        return;
    }

    // 일시정지
    if (event.code === "KeyP")
    {
        if (!event.repeat)
        {
            togglePause();
        }

        return;
    }

    // 기본 스크롤 방지
    if (
        event.code === "Space" ||
        event.code.startsWith("Arrow")
    )
    {
        event.preventDefault();
    }

    if (gameOver || paused)
    {
        return;
    }

    switch (event.code)
    {
        // 왼쪽 이동
        case "KeyA":
        case "ArrowLeft":

            leftPressed = true;

            break;

        // 오른쪽 이동
        case "KeyD":
        case "ArrowRight":

            rightPressed = true;

            break;

        // 떨어뜨리기
        case "KeyS":
        case "ArrowDown":
        case "Space":

            if (!event.repeat)
            {
                dropFruit();
            }

            break;

        // 과일 보관
        case "KeyQ":

            if (!event.repeat)
            {
                holdFruit();
            }

            break;

        // 흔들기
        case "KeyX":

            if (!event.repeat)
            {
                shakeFruits();
            }

            break;
    }
};

// 키보드에서 손을 떼면 이동 중지
window.onkeyup = (event) => {

    switch (event.code)
    {
        case "KeyA":
        case "ArrowLeft":

            leftPressed = false;

            break;

        case "KeyD":
        case "ArrowRight":

            rightPressed = false;

            break;
    }
};

window.addEventListener("blur", stopMove);

// 같은 과일 충돌 감지
Events.on(engine, "collisionStart", (event) => {

    if (gameOver)
    {
        return;
    }

    event.pairs.forEach((collision) => {

        const bodyA = collision.bodyA;
        const bodyB = collision.bodyB;

        // 과일끼리 충돌했는지 확인
        if (
            typeof bodyA.index !== "number" ||
            typeof bodyB.index !== "number"
        )
        {
            return;
        }

        // 현재 조작 중인 과일 제외
        if (
            bodyA === currentBody ||
            bodyB === currentBody
        )
        {
            return;
        }

        // 같은 과일인지 확인
        if (bodyA.index !== bodyB.index)
        {
            return;
        }

        const index = bodyA.index;

        // 마지막 과일 검사
        if (index + 1 >= FRUITS.length)
        {
            return;
        }

        // 이미 합체할 예정인 과일 제외
        if (
            mergingBodies.has(bodyA.id) ||
            mergingBodies.has(bodyB.id)
        )
        {
            return;
        }

        mergingBodies.add(bodyA.id);
        mergingBodies.add(bodyB.id);

        // 충돌 지점
        const support =
            collision.collision.supports[0];

        const x = support
            ? support.x
            : (bodyA.position.x + bodyB.position.x) / 2;

        const y = support
            ? support.y
            : (bodyA.position.y + bodyB.position.y) / 2;

        // 물리 계산 후 합체하도록 저장
        mergeQueue.push({
            bodyA: bodyA,
            bodyB: bodyB,
            index: index,
            x: x,
            y: y
        });
    });
});

// 과일 합체 처리
function mergeFruits()
{
    const queue = mergeQueue;

    mergeQueue = [];

    for (const collision of queue)
    {
        if (gameOver)
        {
            break;
        }

        const bodyA = collision.bodyA;
        const bodyB = collision.bodyB;
        const index = collision.index;

        // 이미 삭제된 과일 검사
        if (
            !world.bodies.includes(bodyA) ||
            !world.bodies.includes(bodyB)
        )
        {
            continue;
        }

        // 충돌한 과일 제거
        World.remove(world, [bodyA, bodyB]);

        // 다음 단계 과일
        const newFruit = FRUITS[index + 1];

        const x = Math.max(
            30 + newFruit.radius,
            Math.min(
                590 - newFruit.radius,
                collision.x
            )
        );

        const y = Math.min(
            790 - newFruit.radius,
            collision.y
        );

        // 새로운 과일 생성
        const newBody = createFruit(
            index + 1,
            x,
            y
        );

        newBody.droppedAt = engine.timing.timestamp;

        // 살짝 튀어 오르는 효과
        Body.setVelocity(newBody, {
            x: 0,
            y: -1.2
        });

        // 콤보 계산
        const now = engine.timing.timestamp;

        if (now - lastMergeTime < 2500)
        {
            combo = Math.min(combo + 1, 9);
        }
        else
        {
            combo = 1;
        }

        lastMergeTime = now;

        // 점수 계산
        const addedScore =
            (index + 1) * 10 * combo;

        score += addedScore;

        // 에너지 충전
        energy = Math.min(100, energy + 10);

        // 최고 점수 저장
        if (score > best)
        {
            best = score;

            try
            {
                localStorage.setItem(
                    "juicyLabBest",
                    best
                );
            }
            catch (error)
            {
                // 저장 실패 시 무시
            }
        }

        // 합체 이펙트
        createParticles(x, y, index + 1);

        floatingTexts.push({
            x: x,
            y: y,
            text: "+" + addedScore,
            life: 1
        });

        // 콤보 알림
        if (combo >= 3)
        {
            showMessage("COMBO x" + combo, 700);
        }

        // 합체 효과음
        playSound(
            350 + index * 65 + combo * 20
        );

        updateUI();

        // 수박 생성 시 승리
        if (newBody.index === FRUITS.length - 1)
        {
            endGame(true);
        }
    }

    mergingBodies.clear();
}

// 매 프레임 게임 업데이트
Events.on(engine, "afterUpdate", () => {

    if (gameOver || paused)
    {
        return;
    }

    const delta =
        engine.timing.lastDelta || 1000 / 60;

    // 과일 합체
    mergeFruits();

    if (gameOver)
    {
        return;
    }

    // 부드러운 과일 이동
    if (currentBody && !disableAction)
    {
        let direction = 0;

        if (leftPressed)
        {
            direction -= 1;
        }

        if (rightPressed)
        {
            direction += 1;
        }

        const targetVelocity =
            direction * MOVE_SPEED;

        // 자연스러운 가속과 감속
        moveVelocity +=
            (targetVelocity - moveVelocity) * 0.3;

        if (Math.abs(moveVelocity) < 0.05)
        {
            moveVelocity = 0;
        }

        setFruitPosition(
            currentBody.position.x +
            moveVelocity * delta / (1000 / 60)
        );
    }

    // 다음 과일 생성
    if (spawnDelay > 0)
    {
        spawnDelay -= delta;

        if (spawnDelay <= 0)
        {
            spawnDelay = 0;

            addFruits();
        }
    }

    // 콤보 유지 시간
    if (
        combo > 1 &&
        engine.timing.timestamp - lastMergeTime > 2500
    )
    {
        combo = 1;

        updateUI();
    }

    // 위험선 검사
    let danger = false;

    world.bodies.forEach((body) => {

        if (
            typeof body.index !== "number" ||
            body === currentBody
        )
        {
            return;
        }

        // 방금 생성된 과일은 잠시 검사 제외
        const age =
            engine.timing.timestamp -
            (body.droppedAt || 0);

        if (age < 1000)
        {
            return;
        }

        // 위험선 위로 과일이 쌓였는지 확인
        if (
            body.position.y - body.circleRadius <
            DANGER_LINE
        )
        {
            danger = true;
        }
    });

    if (danger)
    {
        dangerTime += delta;

        status.style.color = "#ff647c";

        status.textContent =
            "WARNING! " +
            Math.max(
                0,
                (3000 - dangerTime) / 1000
            ).toFixed(1) +
            "초";

        // 3초 이상 위험선 초과
        if (dangerTime >= 3000)
        {
            endGame(false);
        }
    }
    else
    {
        dangerTime = 0;

        status.style.color = "#a6e775";

        status.textContent = "READY TO MERGE";
    }

    // 파티클 움직임
    particles.forEach((particle) => {

        particle.x += particle.vx;
        particle.y += particle.vy;

        particle.vy += 0.15;
        particle.life -= 0.025;
    });

    particles = particles.filter(
        particle => particle.life > 0
    );

    // 점수 이펙트 이동
    floatingTexts.forEach((text) => {

        text.y -= 1.5;
        text.life -= 0.02;
    });

    floatingTexts = floatingTexts.filter(
        text => text.life > 0
    );
});

// 화면 추가 효과
Events.on(render, "afterRender", () => {

    const ctx = render.context;

    ctx.save();

    // 상단 위험선
    ctx.beginPath();

    ctx.setLineDash([12, 8]);

    ctx.strokeStyle = dangerTime > 0
        ? "#ff476f"
        : "#ffffff55";

    ctx.lineWidth = 2;

    ctx.moveTo(30, DANGER_LINE);
    ctx.lineTo(590, DANGER_LINE);

    ctx.stroke();

    ctx.setLineDash([]);

    // 위험선 텍스트
    ctx.font = "13px Arial";
    ctx.fillStyle = "#ffffff80";
    ctx.textAlign = "left";

    ctx.fillText(
        "DANGER LINE",
        42,
        DANGER_LINE - 10
    );

    // 과일 떨어지는 위치 안내선
    if (currentBody && !gameOver && !paused)
    {
        const x = currentBody.position.x;
        const y = currentBody.position.y;

        ctx.beginPath();

        ctx.setLineDash([8, 10]);
        ctx.strokeStyle = "#ffffff45";

        ctx.moveTo(
            x,
            y + currentFruits.radius
        );

        ctx.lineTo(x, 790);

        ctx.stroke();

        ctx.setLineDash([]);
    }

    // 합체 파티클
    particles.forEach((particle) => {

        ctx.globalAlpha = particle.life;

        ctx.fillStyle = particle.color;

        ctx.beginPath();

        ctx.arc(
            particle.x,
            particle.y,
            particle.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();
    });

    // 획득 점수 표시
    floatingTexts.forEach((text) => {

        ctx.globalAlpha = text.life;
        ctx.font = "bold 26px Arial";
        ctx.textAlign = "center";

        ctx.strokeStyle = "#172b24";
        ctx.lineWidth = 4;

        ctx.strokeText(
            text.text,
            text.x,
            text.y
        );

        ctx.fillStyle = "#fff4a8";

        ctx.fillText(
            text.text,
            text.x,
            text.y
        );
    });

    ctx.restore();
});

// 이동 버튼 연결
function bindMoveButton(id, direction)
{
    const button = document.getElementById(id);

    button.addEventListener("pointerdown", (event) => {

        event.preventDefault();

        button.setPointerCapture(event.pointerId);

        if (direction === -1)
        {
            leftPressed = true;
        }
        else
        {
            rightPressed = true;
        }
    });

    function release()
    {
        if (direction === -1)
        {
            leftPressed = false;
        }
        else
        {
            rightPressed = false;
        }
    }

    button.addEventListener("pointerup", release);

    button.addEventListener("pointercancel", release);

    button.addEventListener("lostpointercapture", release);
}

// 화면 이동 버튼
bindMoveButton("left", -1);
bindMoveButton("right", 1);

// 기능 버튼 연결
document.getElementById("drop").onclick = dropFruit;
document.getElementById("hold").onclick = holdFruit;
document.getElementById("shake").onclick = shakeFruits;
document.getElementById("pause").onclick = togglePause;
document.getElementById("restart").onclick = restartGame;

// 마우스 좌표를 게임 좌표로 변경
function pointerPosition(event)
{
    const rect =
        render.canvas.getBoundingClientRect();

    const x =
        (event.clientX - rect.left) *
        WIDTH / rect.width;

    moveVelocity = 0;

    setFruitPosition(x);
}

// 마우스 및 터치 이동
render.canvas.addEventListener(
    "pointermove",
    pointerPosition
);

render.canvas.addEventListener(
    "pointerdown",
    pointerPosition
);

// 클릭 또는 터치 해제 시 떨어뜨리기
render.canvas.addEventListener("pointerup", (event) => {

    pointerPosition(event);

    dropFruit();
});

// 과일 진화 목록 표시
showEvolution();

// 최초 과일 생성
addFruits();

// 화면 업데이트
updateUI();

// 물리 엔진 및 화면 실행
Render.run(render);

Runner.run(runner, engine);

// 로딩 화면 제거
document.getElementById("loading").style.display = "none";

status.textContent = "READY TO MERGE";

// 실행 확인
console.log("JUICY LAB 실행 완료!");
