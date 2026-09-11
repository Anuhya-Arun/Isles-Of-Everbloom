/* ============================================================
   ISLES OF EVERBLOOM
   Complete Game Logic - Part 1 of 2
   Phaser 3.90
   ============================================================ */

const gameState = {
    started: false,
    paused: false,
    dialogueOpen: false,

    mode: "hub",
    island: "hub",

    score: 0,
    crystals: 0,
    lives: 3,

    objective: "Choose any season to explore",

    completed: {
        spring: [false, false],
        autumn: [false, false],
        winter: [false, false]
    },

    crystalAwarded: {
        spring: false,
        autumn: false,
        winter: false
    },

    islandVisited: {
        spring: false,
        autumn: false,
        winter: false
    }
};


/* ============================================================
   GLOBALS
   ============================================================ */

let scene;

let player;
let playerVisual;

let interactables;
let obstacles;

let worldObjects = [];
let worldTweens = [];

let currentInteraction = null;

let cursors;
let wasd;
let spaceKey;

let obstacleCooldown = 0;
let lastPlayerDirection = 1;

let challengeObjects = [];
let challengeTweens = [];
let challengeTimers = [];
let challengeState = null;
let challengeUI = null;
let worldTransitionActive = false;


/* ============================================================
   DOM ELEMENTS
   ============================================================ */

const startScreen = document.getElementById("start-screen");
const howScreen = document.getElementById("how-screen");

const startBtn = document.getElementById("start-btn");
const howBtn = document.getElementById("how-btn");
const howBack = document.getElementById("how-back");

const interactionPrompt = document.getElementById("interaction-prompt");
const interactionText = document.getElementById("interaction-text");

const dialogueBox = document.getElementById("dialogue-box");
const dialogueCharacter = document.getElementById("dialogue-character");
const dialogueText = document.getElementById("dialogue-text");

const pauseMenu = document.getElementById("pause-menu");
const resumeBtn = document.getElementById("resume-btn");
const restartBtn = document.getElementById("restart-btn");
const menuBtn = document.getElementById("menu-btn");

const toast = document.getElementById("toast");

const scoreElement = document.getElementById("score");
const crystalElement = document.getElementById("crystals");
const objectiveElement = document.getElementById("objective-text");


/* ============================================================
   PHASER CONFIG
   ============================================================ */

const config = {
    type: Phaser.AUTO,

    parent: "game-container",

    backgroundColor: "#163e49",

    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1280,
        height: 720
    },

    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },

    render: {
        antialias: true
    },

    scene: {
        create,
        update
    }
};

const game = new Phaser.Game(config);


/* ============================================================
   CREATE
   ============================================================ */

function create() {

    scene = this;

    cursors = scene.input.keyboard.createCursorKeys();

    wasd = scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

    spaceKey = scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    scene.input.keyboard.on("keydown-E", handleInteraction);

    scene.input.keyboard.on(
        "keydown-SPACE",
        () => {

            if (
                gameState.mode === "challenge" &&
                challengeState &&
                challengeState.game === "rhythm"
            ) {
                challengeState.rhythmPressed = true;
            }
        }
    );

    scene.input.keyboard.on("keydown-ESC", () => {

        if (gameState.mode === "challenge") {
            leaveChallenge();
            return;
        }

        if (gameState.dialogueOpen) {
            closeDialogue();
            return;
        }

        togglePause();
    });

    startBtn.addEventListener("click", beginGame);

    howBtn.addEventListener("click", () => {
        startScreen.classList.add("hidden");
        howScreen.classList.remove("hidden");
    });

    howBack.addEventListener("click", () => {
        howScreen.classList.add("hidden");
        startScreen.classList.remove("hidden");
    });

    resumeBtn.addEventListener("click", resumeGame);
    restartBtn.addEventListener("click", restartGame);
    menuBtn.addEventListener("click", returnToMenu);

    buildHub();

    updateHUD();
}


/* ============================================================
   MAIN UPDATE
   ============================================================ */

function update(time, delta) {

    if (!scene) return;

    if (gameState.mode === "challenge") {

        updateChallenge(delta);

        return;
    }

    if (!gameState.started || gameState.paused || worldTransitionActive) {
        return;
    }

    if (gameState.dialogueOpen) {
        updatePlayerVisuals(time);
        return;
    }

    movePlayer(delta);

    updatePlayerVisuals(time);

    updateInteraction();

    if (obstacleCooldown > 0) {
        obstacleCooldown -= delta;
    }
}


/* ============================================================
   GAME START / MENU
   ============================================================ */

function beginGame() {

    gameState.started = true;
    gameState.paused = false;

    startScreen.classList.add("hidden");
    howScreen.classList.add("hidden");
    pauseMenu.classList.add("hidden");

    player.setVisible(true);
    playerVisual.setVisible(true);

    gameState.objective =
        "Choose Spring, Autumn or Winter in any order";

    updateHUD();

    showToast("Welcome to the Isles of Everbloom");
}


function restartGame() {

    gameState.started = true;
    gameState.paused = false;

    gameState.mode = "hub";
    gameState.island = "hub";

    gameState.score = 0;
    gameState.crystals = 0;

    gameState.completed = {
        spring: [false, false],
        autumn: [false, false],
        winter: [false, false]
    };

    gameState.crystalAwarded = {
        spring: false,
        autumn: false,
        winter: false
    };

    gameState.islandVisited = {
        spring: false,
        autumn: false,
        winter: false
    };

    pauseMenu.classList.add("hidden");
    startScreen.classList.add("hidden");

    cleanupChallenge();

    buildHub();

    player.setVisible(true);
    playerVisual.setVisible(true);

    gameState.objective =
        "Choose Spring, Autumn or Winter in any order";

    updateHUD();

    showToast("A new journey begins");
}


function returnToMenu() {

    gameState.started = false;
    gameState.paused = false;

    pauseMenu.classList.add("hidden");
    howScreen.classList.add("hidden");

    startScreen.classList.remove("hidden");

    cleanupChallenge();

    buildHub();

    player.setVisible(false);
    playerVisual.setVisible(false);
}


/* ============================================================
   PAUSE
   ============================================================ */

function togglePause() {

    if (!gameState.started) return;

    gameState.paused = !gameState.paused;

    if (gameState.paused) {
        pauseMenu.classList.remove("hidden");
    } else {
        pauseMenu.classList.add("hidden");
    }
}


function resumeGame() {

    gameState.paused = false;

    pauseMenu.classList.add("hidden");
}


/* ============================================================
   HUD
   ============================================================ */

function updateHUD() {

    scoreElement.textContent = gameState.score;

    crystalElement.textContent =
        `${gameState.crystals} / 3`;

    objectiveElement.textContent =
        gameState.objective;
}


function setObjective(text) {

    gameState.objective = text;

    updateHUD();
}


/* ============================================================
   TOAST
   ============================================================ */

let toastTimer = null;

function showToast(message) {

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);
}


/* ============================================================
   DIALOGUE
   ============================================================ */

let dialogueLines = [];
let dialogueIndex = 0;


function openDialogue(character, lines) {

    if (gameState.mode === "challenge") return;

    gameState.dialogueOpen = true;

    dialogueCharacter.textContent =
        character.toUpperCase();

    dialogueLines = lines;
    dialogueIndex = 0;

    dialogueText.textContent =
        dialogueLines[dialogueIndex];

    dialogueBox.classList.add("visible");

    interactionPrompt.classList.remove("visible");
}


function handleDialogueAdvance() {

    if (!gameState.dialogueOpen) return;

    dialogueIndex++;

    if (dialogueIndex >= dialogueLines.length) {

        closeDialogue();

        return;
    }

    dialogueText.textContent =
        dialogueLines[dialogueIndex];
}


function closeDialogue() {

    gameState.dialogueOpen = false;

    dialogueBox.classList.remove("visible");

    dialogueLines = [];
    dialogueIndex = 0;
}


/* ============================================================
   INTERACTION
   ============================================================ */

function handleInteraction() {

    if (!gameState.started) return;

    if (gameState.paused) return;

    if (gameState.mode === "challenge") return;

    if (gameState.dialogueOpen) {

        handleDialogueAdvance();

        return;
    }

    if (!currentInteraction) return;

    const data =
        currentInteraction.getData("interaction");

    if (!data) return;

    switch (data.type) {

        case "mira":
            talkToMira();
            break;

        case "spring":
        case "autumn":
        case "winter":
            enterIsland(data.type);
            break;

        case "challenge":
            openChallenge(
                data.season,
                data.index
            );
            break;

        case "return":
            returnToHub();
            break;
    }
}


function updateInteraction() {

    if (!player || !interactables) return;

    let closest = null;
    let closestDistance = Infinity;

    interactables.children.iterate(obj => {

        if (!obj || !obj.active) return;

        const distance =
            Phaser.Math.Distance.Between(
                player.x,
                player.y,
                obj.x,
                obj.y
            );

        const range =
            obj.getData("range") || 130;

        if (distance < range && distance < closestDistance) {

            closest = obj;
            closestDistance = distance;
        }
    });

    currentInteraction = closest;

    if (!closest) {

        interactionPrompt.classList.remove("visible");

        return;
    }

    const data =
        closest.getData("interaction");

    if (!data) return;

    interactionText.textContent =
        data.label || "Interact";

    interactionPrompt.classList.add("visible");
}


/* ============================================================
   MIRA
   ============================================================ */

function talkToMira() {

    openDialogue("Mira", [

        "Welcome to Everbloom Bay, traveller.",

        "Three seasonal realms surround this island:- Spring, Autumn and Winter.",

        "You do not need to follow a fixed path.",

        "Choose whichever season calls to you first.",

        "Complete its two challenges and restore its Seasonal Crystal.",

        "When all three crystals shine again, Everbloom will awaken."

    ]);
}


/* ============================================================
   WORLD MANAGEMENT
   ============================================================ */

function trackWorld(object) {

    if (object) {
        worldObjects.push(object);
    }

    return object;
}


function trackTween(tween) {

    if (tween) {
        worldTweens.push(tween);
    }

    return tween;
}

function animateWorldEntry(color = 0x0b2630) {
    scene.cameras.main.resetFX();
    worldTransitionActive = false;
}


function clearWorld() {

    worldTweens.forEach(tween => {

        if (tween && tween.isPlaying()) {
            tween.stop();
        }

    });

    worldTweens = [];

    worldObjects.forEach(object => {

        if (object && object.destroy) {
            object.destroy();
        }

    });

    worldObjects = [];

    if (interactables) {
        interactables.destroy();
        interactables = null;
    }

    if (obstacles) {
        obstacles.destroy();
        obstacles = null;
    }

    player = null;
    playerVisual = null;
}


/* ============================================================
   HUB / EVERBLOOM BAY
   ============================================================ */

function buildHub() {

    cleanupChallenge();

    clearWorld();

    gameState.mode = "hub";
    gameState.island = "hub";

    scene.physics.world.setBounds(
        0,
        0,
        2600,
        1700
    );

    scene.cameras.main.setBounds(
        0,
        0,
        2600,
        1700
    );

    createOcean();

    createHubIsland();

    createSeasonalDistricts();

    createHubDecorations();

    createMira(
        1300,
        1010
    );

    createSeasonTree(
        1300,
        680
    );

    createPlayer(
        1300,
        1100
    );

    scene.cameras.main.startFollow(
        player,
        true,
        0.08,
        0.08
    );

    scene.cameras.main.setZoom(1);

    setObjective(
        gameState.crystals === 0
            ? "Choose Spring, Autumn or Winter in any order"
            : gameState.crystals === 3
                ? "Everbloom is restored"
                : "Explore another season or finish the remaining challenges"
    );

    animateWorldEntry(0x174b5b);
}


/* ============================================================
   OCEAN
   ============================================================ */

function createOcean() {

    const bg = trackWorld(
        scene.add.rectangle(
            1300,
            850,
            2600,
            1700,
            0x174b5b
        )
    );

    bg.setDepth(-20);

    for (let i = 0; i < 70; i++) {

        const x =
            Phaser.Math.Between(20, 2580);

        const y =
            Phaser.Math.Between(20, 1680);

        const wave = trackWorld(
            scene.add.graphics()
        );

        wave.lineStyle(
            2,
            0x6ec5c6,
            0.16
        );

        wave.beginPath();

        wave.arc(
            x,
            y,
            Phaser.Math.Between(8, 22),
            Math.PI,
            Math.PI * 2
        );

        wave.strokePath();

        wave.setDepth(-10);

        trackTween(
            scene.tweens.add({
                targets: wave,
                alpha: {
                    from: 0.35,
                    to: 0.9
                },
                duration: Phaser.Math.Between(1800, 3000),
                delay: Phaser.Math.Between(0, 900),
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            })
        );
    }
}


/* ============================================================
   HUB ISLAND
   ============================================================ */

function createHubIsland() {

    const island = trackWorld(
        scene.add.graphics()
    );

    island.fillStyle(
        0xc8a978,
        1
    );

    island.fillEllipse(
        1300,
        850,
        2250,
        1300
    );

    island.fillStyle(
        0xe0bd85,
        0.75
    );

    island.fillEllipse(
        1300,
        830,
        2050,
        1130
    );

    island.lineStyle(
        8,
        0x7c5b3c,
        0.65
    );

    island.strokeEllipse(
        1300,
        850,
        2250,
        1300
    );

    island.setDepth(-5);

    createPath(
        1300,
        850,
        1200,
        80
    );

    createPath(
        1300,
        850,
        80,
        1050
    );
}


function createPath(
    x,
    y,
    width,
    height
) {

    const path = trackWorld(
        scene.add.rectangle(
            x,
            y,
            width,
            height,
            0xc7a46f,
            0.65
        )
    );

    path.setDepth(-1);
}


/* ============================================================
   SEASONAL DISTRICTS
   ============================================================ */

function createSeasonalDistricts() {

    /* ---------- SPRING ---------- */

    const spring = trackWorld(
        scene.add.graphics()
    );

    spring.fillStyle(
        0xb8d69a,
        0.95
    );

    spring.fillEllipse(
        550,
        760,
        720,
        540
    );

    spring.lineStyle(
        5,
        0x6f9d6d,
        0.55
    );

    spring.strokeEllipse(
        550,
        760,
        720,
        540
    );

    addSeasonLabel(
        "SPRING",
        550,
        500,
        0xe6a8bf
    );

    createSeasonGate(
        "spring",
        550,
        760,
        "Blossomwind Isle",
        0xe5a8c1,
        0xf6d6df
    );

    createCherryTree(
        350,
        650,
        1
    );

    createCherryTree(
        720,
        690,
        0.9
    );

    createFlowerPatch(
        390,
        880,
        0xe994b4
    );

    createFlowerPatch(
        690,
        880,
        0xffd47a
    );


    /* ---------- AUTUMN ---------- */

    const autumn = trackWorld(
        scene.add.graphics()
    );

    autumn.fillStyle(
        0xd7a060,
        0.95
    );

    autumn.fillEllipse(
        2050,
        760,
        720,
        540
    );

    autumn.lineStyle(
        5,
        0x9c633b,
        0.55
    );

    autumn.strokeEllipse(
        2050,
        760,
        720,
        540
    );

    addSeasonLabel(
        "AUTUMN",
        2050,
        500,
        0xe37e45
    );

    createSeasonGate(
        "autumn",
        2050,
        760,
        "Emberleaf Isle",
        0xd77a43,
        0xf2b05d
    );

    createAutumnTree(
        1830,
        650,
        1
    );

    createAutumnTree(
        2260,
        680,
        1.1
    );

    createLeafPile(
        1840,
        900
    );

    createLeafPile(
        2250,
        900
    );


    /* ---------- WINTER ---------- */

    const winter = trackWorld(
        scene.add.graphics()
    );

    winter.fillStyle(
        0xaec7d9,
        0.95
    );

    winter.fillEllipse(
        1300,
        320,
        720,
        430
    );

    winter.lineStyle(
        5,
        0x7095aa,
        0.55
    );

    winter.strokeEllipse(
        1300,
        320,
        720,
        430
    );

    addSeasonLabel(
        "WINTER",
        1300,
        105,
        0x8fc9e8
    );

    createSeasonGate(
        "winter",
        1300,
        320,
        "Frostmoon Isle",
        0x8cc5e6,
        0xdaf4ff
    );

    createPineTree(
        1050,
        300,
        1
    );

    createPineTree(
        1560,
        290,
        1.1
    );

    createSnowMounds(
        1100,
        470
    );

    createSnowMounds(
        1500,
        460
    );
}


/* ============================================================
   SEASON LABEL
   ============================================================ */

function addSeasonLabel(
    text,
    x,
    y,
    color
) {

    const label = trackWorld(
        scene.add.text(
            x,
            y,
            text,
            {
                fontFamily: "Georgia",
                fontSize: "26px",
                fontStyle: "bold",
                color: Phaser.Display.Color.IntegerToColor(color).rgba,
                stroke: "#173c45",
                strokeThickness: 7
            }
        )
    );

    label.setOrigin(0.5);
    label.setDepth(5);
}


/* ============================================================
   SEASON GATES
   ============================================================ */

function createSeasonGate(
    season,
    x,
    y,
    label,
    mainColor,
    glowColor
) {

    const g = trackWorld(
        scene.add.graphics()
    );

    g.fillStyle(
        0x284c50,
        1
    );

    g.fillRoundedRect(
        x - 75,
        y - 90,
        150,
        180,
        30
    );

    g.lineStyle(
        7,
        mainColor,
        1
    );

    g.strokeRoundedRect(
        x - 75,
        y - 90,
        150,
        180,
        30
    );

    g.fillStyle(
        glowColor,
        0.28
    );

    g.fillEllipse(
        x,
        y,
        90,
        120
    );

    g.fillStyle(
        glowColor,
        0.9
    );

    g.fillCircle(
        x,
        y,
        25
    );

    g.setDepth(2);

    trackTween(
        scene.tweens.add({
            targets: g,
            scaleX: 1.04,
            scaleY: 1.04,
            alpha: 0.82,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        })
    );

    const text = trackWorld(
        scene.add.text(
            x,
            y + 120,
            label,
            {
                fontFamily: "Georgia",
                fontSize: "18px",
                fontStyle: "bold",
                color: "#fff4d4",
                stroke: "#173c45",
                strokeThickness: 5,
                align: "center"
            }
        )
    );

    text.setOrigin(0.5);
    text.setDepth(5);

    const zone = createInteractionZone(
        x,
        y,
        180,
        200
    );

    zone.setData(
        "interaction",
        {
            type: season,
            label: `Enter ${label}`
        }
    );
}


/* ============================================================
   MIRA — IMPROVED MERMAID CHARACTER
   ============================================================ */

function createMira(x, y) {

    const container =
        scene.add.container(x, y);

    trackWorld(container);

    container.setDepth(8);

    /* Shadow */

    const shadow =
        scene.add.graphics();

    shadow.fillStyle(
        0x17363d,
        0.22
    );

    shadow.fillEllipse(
        0,
        34,
        72,
        18
    );

    container.add(shadow);


    /* Mermaid tail */

    const tail =
        scene.add.graphics();

    tail.fillStyle(
        0x4d9f9b,
        1
    );

    tail.beginPath();

    tail.moveTo(-18, 10);
    tail.lineTo(-48, 50);
    tail.lineTo(0, 36);
    tail.lineTo(48, 50);
    tail.lineTo(18, 10);
    tail.closePath();

    tail.fillPath();

    tail.fillStyle(
        0x72c4b8,
        1
    );

    tail.fillEllipse(
        0,
        15,
        28,
        55
    );

    container.add(tail);

    trackTween(
        scene.tweens.add({
            targets: tail,
            angle: {
                from: -3,
                to: 3
            },
            scaleX: {
                from: 0.96,
                to: 1.04
            },
            duration: 1100,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        })
    );


    /* Body */

    const body =
        scene.add.graphics();

    body.fillStyle(
        0xf1c9a6,
        1
    );

    body.fillEllipse(
        0,
        -12,
        42,
        55
    );

    body.fillStyle(
        0xe7839b,
        1
    );

    body.fillTriangle(
        -22,
        -18,
        0,
        18,
        22,
        -18
    );

    container.add(body);


    /* Hair */

    const hair =
        scene.add.graphics();

    hair.fillStyle(
        0x542f4c,
        1
    );

    hair.fillCircle(
        0,
        -43,
        31
    );

    hair.fillEllipse(
        -23,
        -14,
        24,
        55
    );

    hair.fillEllipse(
        23,
        -14,
        24,
        55
    );

    container.add(hair);


    /* Face */

    const face =
        scene.add.graphics();

    face.fillStyle(
        0xf5d0ad,
        1
    );

    face.fillCircle(
        0,
        -43,
        23
    );

    face.fillStyle(
        0x372b38,
        1
    );

    face.fillCircle(
        -8,
        -45,
        3
    );

    face.fillCircle(
        8,
        -45,
        3
    );

    face.lineStyle(
        2,
        0x9b5268,
        1
    );

    face.arc(
        0,
        -37,
        7,
        0.2,
        Math.PI - 0.2
    );

    container.add(face);


    /* Shell crown */

    const crown =
        scene.add.graphics();

    crown.fillStyle(
        0xffd990,
        1
    );

    crown.fillTriangle(
        -16,
        -64,
        -4,
        -84,
        0,
        -63
    );

    crown.fillTriangle(
        -3,
        -63,
        8,
        -87,
        13,
        -61
    );

    crown.fillTriangle(
        9,
        -62,
        22,
        -80,
        24,
        -57
    );

    container.add(crown);

    trackTween(
        scene.tweens.add({
            targets: crown,
            y: -2,
            angle: {
                from: -2,
                to: 2
            },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        })
    );

    const aura =
        scene.add.circle(
            0,
            -18,
            58,
            0xf1d18b,
            0.07
        );

    aura.setDepth(-1);
    container.addAt(aura, 0);

    trackTween(
        scene.tweens.add({
            targets: aura,
            scale: {
                from: 0.88,
                to: 1.14
            },
            alpha: {
                from: 0.03,
                to: 0.14
            },
            duration: 1600,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        })
    );


    const name =
        scene.add.text(
            0,
            70,
            "MIRA",
            {
                fontFamily: "Georgia",
                fontSize: "16px",
                fontStyle: "bold",
                color: "#fff0c5",
                stroke: "#173c45",
                strokeThickness: 4
            }
        );

    name.setOrigin(0.5);

    container.add(name);


    trackTween(
        scene.tweens.add({
            targets: container,
            y: y - 5,
            duration: 1400,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        })
    );


    const zone =
        createInteractionZone(
            x,
            y,
            150,
            160
        );

    zone.setData(
        "interaction",
        {
            type: "mira",
            label: "Talk to Mira"
        }
    );
}


/* ============================================================
   SEASON TREE
   ============================================================ */

function createSeasonTree(x, y) {

    const tree =
        scene.add.graphics();

    trackWorld(tree);

    tree.setDepth(4);

    /* trunk */

    tree.fillStyle(
        0x654638,
        1
    );

    tree.fillRoundedRect(
        x - 30,
        y - 20,
        60,
        170,
        22
    );


    /* branches */

    tree.lineStyle(
        18,
        0x654638,
        1
    );

    tree.beginPath();

    tree.moveTo(x, y + 10);
    tree.lineTo(x - 100, y - 90);

    tree.moveTo(x, y - 10);
    tree.lineTo(x + 100, y - 100);

    tree.moveTo(x, y - 30);
    tree.lineTo(x, y - 150);

    tree.strokePath();


    /* crown */

    tree.fillStyle(
        0x8bbf89,
        1
    );

    tree.fillCircle(
        x - 85,
        y - 105,
        58
    );

    tree.fillCircle(
        x + 85,
        y - 115,
        58
    );

    tree.fillCircle(
        x,
        y - 165,
        68
    );


    /* crystals */

    const crystalColors = [
        0xf0a8c0,
        0xe99c55,
        0x91cdeb
    ];

    const positions = [
        [-48, -130],
        [48, -135],
        [0, -195]
    ];

    positions.forEach((pos, i) => {

        const restored =
            gameState.crystalAwarded[
                ["spring", "autumn", "winter"][i]
            ];

        const c =
            scene.add.graphics();

        c.fillStyle(
            restored
                ? crystalColors[i]
                : 0x5b6e70,
            1
        );

        c.beginPath();

        c.moveTo(
            x + pos[0],
            y + pos[1] - 22
        );

        c.lineTo(
            x + pos[0] + 15,
            y + pos[1]
        );

        c.lineTo(
            x + pos[0],
            y + pos[1] + 28
        );

        c.lineTo(
            x + pos[0] - 15,
            y + pos[1]
        );

        c.closePath();

        c.fillPath();

        trackWorld(c);
    });
}


/* ============================================================
   HUB DECORATIONS
   ============================================================ */

function createHubDecorations() {

    const positions = [
        [160, 400],
        [2450, 430],
        [250, 1280],
        [2380, 1260],
        [950, 1250],
        [1650, 1260]
    ];

    positions.forEach(([x, y]) => {

        createRock(
            x,
            y,
            Phaser.Math.Between(18, 30)
        );

    });


    for (let i = 0; i < 18; i++) {

        const x =
            Phaser.Math.Between(250, 2350);

        const y =
            Phaser.Math.Between(530, 1300);

        createFlowerPatch(
            x,
            y,
            i % 2 === 0
                ? 0xf2c3d0
                : 0xffd58a
        );
    }
}


/* ============================================================
   SEASONAL TREES
   ============================================================ */

function createCherryTree(
    x,
    y,
    scale = 1
) {

    const g =
        scene.add.graphics();

    trackWorld(g);

    g.setScale(scale);
    g.setPosition(x, y);

    g.fillStyle(
        0x69483d,
        1
    );

    g.fillRoundedRect(
        -16,
        -10,
        32,
        120,
        15
    );

    g.lineStyle(
        10,
        0x69483d,
        1
    );

    g.beginPath();

    g.moveTo(0, 25);
    g.lineTo(-55, -25);

    g.moveTo(0, 10);
    g.lineTo(55, -30);

    g.strokePath();

    g.fillStyle(
        0xe8a5bd,
        1
    );

    [
        [-65, -35],
        [-25, -65],
        [20, -60],
        [65, -35],
        [0, -95]
    ].forEach(([px, py]) => {

        g.fillCircle(
            px,
            py,
            40
        );

    });

    g.fillStyle(
        0xf7d6e1,
        0.9
    );

    g.fillCircle(
        -45,
        -42,
        10
    );

    g.fillCircle(
        25,
        -67,
        9
    );
}


function createAutumnTree(
    x,
    y,
    scale = 1
) {

    const g =
        scene.add.graphics();

    trackWorld(g);

    g.setScale(scale);
    g.setPosition(x, y);

    g.fillStyle(
        0x634437,
        1
    );

    g.fillRoundedRect(
        -17,
        -5,
        34,
        125,
        15
    );

    g.lineStyle(
        10,
        0x634437,
        1
    );

    g.beginPath();

    g.moveTo(0, 30);
    g.lineTo(-55, -25);

    g.moveTo(0, 10);
    g.lineTo(55, -30);

    g.strokePath();

    const leaves = [
        [0, -70, 48, 0xd95f35],
        [-50, -45, 40, 0xe77d37],
        [50, -45, 42, 0xc94c31],
        [-20, -105, 42, 0xf0a34c],
        [28, -100, 42, 0xd96531]
    ];

    leaves.forEach(
        ([px, py, r, color]) => {

            g.fillStyle(color, 1);

            g.fillCircle(
                px,
                py,
                r
            );
        }
    );
}


function createPineTree(
    x,
    y,
    scale = 1
) {

    const g =
        scene.add.graphics();

    trackWorld(g);

    g.setScale(scale);
    g.setPosition(x, y);

    g.fillStyle(
        0x315e5b,
        1
    );

    g.fillTriangle(
        0,
        -140,
        -70,
        20,
        70,
        20
    );

    g.fillTriangle(
        0,
        -90,
        -85,
        55,
        85,
        55
    );

    g.fillTriangle(
        0,
        -35,
        -100,
        90,
        100,
        90
    );

    g.fillStyle(
        0xf2fbff,
        0.9
    );

    g.fillTriangle(
        0,
        -140,
        -22,
        -88,
        22,
        -88
    );

    g.fillTriangle(
        -35,
        -75,
        -58,
        -25,
        -12,
        -25
    );
}


/* ============================================================
   SMALL ENVIRONMENT ELEMENTS
   ============================================================ */

function createFlowerPatch(
    x,
    y,
    color
) {

    const g =
        scene.add.graphics();

    trackWorld(g);

    for (let i = 0; i < 5; i++) {

        const px =
            Phaser.Math.Between(-35, 35);

        const py =
            Phaser.Math.Between(-25, 25);

        g.fillStyle(
            color,
            0.9
        );

        g.fillCircle(
            x + px,
            y + py,
            7
        );

        g.fillStyle(
            0xf9df87,
            1
        );

        g.fillCircle(
            x + px,
            y + py,
            3
        );
    }
}


function createLeafPile(x, y) {

    const g =
        scene.add.graphics();

    trackWorld(g);

    const colors = [
        0xc95331,
        0xe37c32,
        0xf0a23e,
        0xb74632
    ];

    for (let i = 0; i < 12; i++) {

        g.fillStyle(
            colors[i % colors.length],
            0.9
        );

        g.fillEllipse(
            x + Phaser.Math.Between(-55, 55),
            y + Phaser.Math.Between(-20, 20),
            18,
            9
        );
    }
}


function createSnowMounds(x, y) {

    const g =
        scene.add.graphics();

    trackWorld(g);

    g.fillStyle(
        0xf0f7fb,
        0.95
    );

    g.fillEllipse(
        x - 35,
        y,
        150,
        65
    );

    g.fillEllipse(
        x + 60,
        y + 5,
        120,
        55
    );
}


function createRock(
    x,
    y,
    radius
) {

    const g =
        scene.add.graphics();

    trackWorld(g);

    g.fillStyle(
        0x66767a,
        1
    );

    g.fillEllipse(
        x,
        y,
        radius * 2,
        radius * 1.35
    );

    g.fillStyle(
        0x8d9b9d,
        0.5
    );

    g.fillEllipse(
        x - radius * 0.25,
        y - radius * 0.2,
        radius * 0.7,
        radius * 0.35
    );

    g.setDepth(3);

    createObstacleZone(
        x,
        y,
        radius * 1.7,
        radius * 1.25
    );
}


/* ============================================================
   PLAYER
   ============================================================ */

function createPlayer(x, y) {

    player =
        trackWorld(
            scene.add.rectangle(
                x,
                y,
                36,
                46,
                0xffffff,
                0
            )
        );

    scene.physics.add.existing(
        player
    );

    player.body.setSize(
        32,
        42
    );

    player.body.setCollideWorldBounds(
        true
    );

    player.setDepth(10);


    playerVisual =
        createPlayerVisual(
            x,
            y
        );

    playerVisual.setDepth(11);
    playerVisual.setScale(1.18);

    player.setVisible(
        gameState.started
    );

    playerVisual.setVisible(
        gameState.started
    );


    if (obstacles) {

        scene.physics.add.collider(
            player,
            obstacles,
            obstacleHit,
            null,
            scene
        );
    }
}


/* ============================================================
   IMPROVED PLAYER VISUAL
   ============================================================ */

function createPlayerVisual(x, y) {

    const container =
        scene.add.container(
            x,
            y
        );

    trackWorld(container);


    /* shadow */

    const shadow =
        scene.add.graphics();

    shadow.fillStyle(
        0x17363d,
        0.25
    );

    shadow.fillEllipse(
        0,
        25,
        48,
        14
    );

    container.add(shadow);


    /* cloak */

    const cloak =
        scene.add.graphics();

    cloak.fillStyle(
        0x355f68,
        1
    );

    cloak.beginPath();

    cloak.moveTo(
        -19,
        -2
    );

    cloak.lineTo(
        0,
        -15
    );

    cloak.lineTo(
        19,
        -2
    );

    cloak.lineTo(
        23,
        24
    );

    cloak.lineTo(
        -23,
        24
    );

    cloak.closePath();

    cloak.fillPath();

    cloak.lineStyle(
        2,
        0x8cb6ae,
        0.9
    );

    cloak.strokePath();

    container.add(cloak);

    trackTween(
        scene.tweens.add({
            targets: cloak,
            scaleX: {
                from: 0.96,
                to: 1.04
            },
            skewX: {
                from: -0.03,
                to: 0.03
            },
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        })
    );


    /* scarf */

    const scarf =
        scene.add.graphics();

    scarf.fillStyle(
        0xf1c96d,
        1
    );

    scarf.fillRoundedRect(
        -17,
        -8,
        34,
        9,
        4
    );

    scarf.fillTriangle(
        10,
        -1,
        25,
        17,
        12,
        14
    );

    container.add(scarf);

    const belt =
        scene.add.graphics();

    belt.fillStyle(
        0x244852,
        1
    );

    belt.fillRoundedRect(
        -21,
        10,
        42,
        6,
        3
    );

    belt.fillStyle(
        0xf1d18b,
        1
    );

    belt.fillRoundedRect(
        -4,
        9,
        8,
        8,
        2
    );

    container.add(belt);

    trackTween(
        scene.tweens.add({
            targets: scarf,
            angle: {
                from: -4,
                to: 5
            },
            duration: 520,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        })
    );


    /* face */

    const face =
        scene.add.graphics();

    face.fillStyle(
        0xf0c7a4,
        1
    );

    face.fillCircle(
        0,
        -30,
        18
    );

    face.lineStyle(
        2,
        0xb97870,
        0.75
    );

    face.strokeCircle(
        0,
        -30,
        18
    );

    face.fillStyle(
        0xd98f83,
        0.65
    );

    face.fillCircle(
        -11,
        -26,
        2.5
    );

    face.fillCircle(
        11,
        -26,
        2.5
    );

    face.lineStyle(
        1.5,
        0xb15e62,
        0.9
    );

    face.lineBetween(
        -2,
        -25,
        0,
        -22
    );

    face.arc(
        0,
        -21,
        5,
        0.2,
        Math.PI - 0.2
    );

    container.add(face);


    /* hair */

    const hair =
        scene.add.graphics();

    hair.fillStyle(
        0x342c3c,
        1
    );

    hair.fillEllipse(
        0,
        -45,
        31,
        24
    );

    hair.fillEllipse(
        -15,
        -21,
        7,
        22
    );

    hair.fillEllipse(
        15,
        -21,
        7,
        22
    );

    container.add(hair);


    /* eyes */

    const eyes =
        scene.add.graphics();

    eyes.fillStyle(
        0xfff4dc,
        1
    );

    eyes.fillEllipse(
        -6,
        -31,
        7,
        5
    );

    eyes.fillEllipse(
        6,
        -31,
        7,
        5
    );

    eyes.fillStyle(
        0x1e2931,
        1
    );

    eyes.fillCircle(
        -6,
        -31,
        1.8
    );

    eyes.fillCircle(
        6,
        -31,
        1.8
    );

    eyes.lineStyle(
        1.5,
        0x342c3c,
        0.9
    );

    eyes.lineBetween(
        -10,
        -35,
        -3,
        -36
    );

    eyes.lineBetween(
        3,
        -36,
        10,
        -35
    );

    container.add(eyes);


    /* hood */

    const hood =
        scene.add.graphics();

    hood.lineStyle(
        2,
        0x8cb6ae,
        0.4
    );

    hood.strokeCircle(
        0,
        -31,
        19
    );

    container.add(hood);


    /* boots */

    const boots =
        scene.add.graphics();

    boots.fillStyle(
        0x463c3a,
        1
    );

    boots.fillRoundedRect(
        -17,
        19,
        13,
        9,
        4
    );

    boots.fillRoundedRect(
        4,
        19,
        13,
        9,
        4
    );

    container.add(boots);


    /* tiny satchel */

    const bag =
        scene.add.graphics();

    bag.fillStyle(
        0xb9784f,
        1
    );

    bag.fillRoundedRect(
        14,
        0,
        13,
        16,
        4
    );

    bag.lineStyle(
        2,
        0x5d4235,
        1
    );

    bag.strokeRoundedRect(
        14,
        0,
        13,
        16,
        4
    );

    container.add(bag);


    return container;
}


/* ============================================================
   PLAYER MOVEMENT
   ============================================================ */

function movePlayer(delta) {

    if (!player || !player.body) return;

    const speed = 240;

    let vx = 0;
    let vy = 0;

    if (
        cursors.left.isDown ||
        wasd.left.isDown
    ) {
        vx -= 1;
    }

    if (
        cursors.right.isDown ||
        wasd.right.isDown
    ) {
        vx += 1;
    }

    if (
        cursors.up.isDown ||
        wasd.up.isDown
    ) {
        vy -= 1;
    }

    if (
        cursors.down.isDown ||
        wasd.down.isDown
    ) {
        vy += 1;
    }


    if (vx !== 0 || vy !== 0) {

        const length =
            Math.sqrt(
                vx * vx +
                vy * vy
            );

        vx /= length;
        vy /= length;

        player.body.setVelocity(
            vx * speed,
            vy * speed
        );

        if (vx !== 0) {
            lastPlayerDirection =
                vx > 0 ? 1 : -1;
        }

    } else {

        player.body.setVelocity(
            0,
            0
        );
    }
}


/* ============================================================
   PLAYER VISUAL UPDATE
   ============================================================ */

function updatePlayerVisuals(time) {

    if (!player || !playerVisual) {
        return;
    }

    const bob =
        Math.sin(
            time * 0.008
        ) * 2;

    playerVisual.x =
        player.x;

    playerVisual.y =
        player.y + bob;

    playerVisual.scaleX =
        lastPlayerDirection;

}


/* ============================================================
   INTERACTION ZONES
   ============================================================ */

function createInteractionZone(
    x,
    y,
    width,
    height
) {

    const zone =
        trackWorld(
            scene.add.rectangle(
                x,
                y,
                width,
                height,
                0xffffff,
                0
            )
        );

    zone.setData(
        "range",
        130
    );

    scene.physics.add.existing(
        zone,
        true
    );

    if (!interactables) {

        interactables =
            scene.add.group();
    }

    interactables.add(zone);

    return zone;
}


/* ============================================================
   OBSTACLE ZONES
   ============================================================ */

function createObstacleZone(
    x,
    y,
    width,
    height
) {

    const zone =
        trackWorld(
            scene.add.rectangle(
                x,
                y,
                width,
                height,
                0xffffff,
                0
            )
        );

    scene.physics.add.existing(
        zone,
        true
    );

    if (!obstacles) {

        obstacles =
            scene.physics.add.staticGroup();
    }

    obstacles.add(zone);

    return zone;
}


/* ============================================================
   OBSTACLE FEEDBACK
   ============================================================ */

function obstacleHit(
    playerObject,
    obstacle
) {

    if (obstacleCooldown > 0) {
        return;
    }

    obstacleCooldown = 450;

    const angle =
        Phaser.Math.Angle.Between(
            obstacle.x,
            obstacle.y,
            playerObject.x,
            playerObject.y
        );

    playerObject.body.setVelocity(
        Math.cos(angle) * 180,
        Math.sin(angle) * 180
    );


    /* gentle flash */

    playerVisual.setAlpha(0.45);

    scene.time.delayedCall(
        120,
        () => {

            if (playerVisual) {
                playerVisual.setAlpha(1);
            }

        }
    );


    /* floating feedback */

    const text =
        trackWorld(
            scene.add.text(
                playerObject.x,
                playerObject.y - 55,
                "Easy there!",
                {
                    fontFamily: "Georgia",
                    fontSize: "16px",
                    fontStyle: "bold",
                    color: "#ffe4a5",
                    stroke: "#24454b",
                    strokeThickness: 4
                }
            )
        );

    text.setOrigin(0.5);
    text.setDepth(20);

    scene.tweens.add({
        targets: text,
        y: text.y - 30,
        alpha: 0,
        duration: 650,
        onComplete: () => {
            text.destroy();
        }
    });
}


/* ============================================================
   ISLAND ENTRY
   ============================================================ */

function enterIsland(season) {

    gameState.island = season;
    gameState.mode = "island";

    gameState.islandVisited[season] = true;

    buildIsland(season);
}


/* ============================================================
   BUILD SEASONAL ISLAND
   ============================================================ */

function buildIsland(season) {

    cleanupChallenge();

    clearWorld();

    gameState.mode = "island";

    const data =
        getSeasonData(season);

    scene.physics.world.setBounds(
        0,
        0,
        1900,
        1250
    );

    scene.cameras.main.setBounds(
        0,
        0,
        1900,
        1250
    );


    /* Background */

    const bg =
        trackWorld(
            scene.add.rectangle(
                950,
                625,
                1900,
                1250,
                data.background
            )
        );

    bg.setDepth(-20);


    createIslandLandscape(
        season,
        data
    );


    createIslandDecorations(
        season,
        data
    );


    createChallengePortal(
        season,
        570,
        550,
        0
    );

    createChallengePortal(
        season,
        1330,
        550,
        1
    );


    createReturnGate(
        950,
        1040
    );


    createSeasonGuardian(
        season,
        950,
        290,
        data
    );


    createIslandPlayer(
        950,
        880
    );


    scene.cameras.main.startFollow(
        player,
        true,
        0.08,
        0.08
    );

    scene.cameras.main.setZoom(1);


    const completed =
        gameState.completed[season];

    if (
        completed[0] &&
        completed[1]
    ) {

        setObjective(
            `${data.name} restored! return to Everbloom Bay`
        );

    } else {

        setObjective(
            `Complete both ${data.shortName} challenges. Return anytime.`
        );
    }

    animateWorldEntry(data.background);
}


/* ============================================================
   SEASON DATA
   ============================================================ */

function getSeasonData(season) {

    const data = {

        spring: {
            name: "Blossomwind Isle",
            shortName: "Spring",
            background: 0x9bc9b0,
            ground: 0xd7e7bb,
            accent: 0xe9a8bd,
            secondary: 0xffd47d,
            dark: 0x476f65,
            challengeNames: [
                "Petal Path",
                "Firefly Chase"
            ]
        },

        autumn: {
            name: "Emberleaf Isle",
            shortName: "Autumn",
            background: 0x9c6047,
            ground: 0xd8a060,
            accent: 0xe37d3e,
            secondary: 0xf2b65e,
            dark: 0x694638,
            challengeNames: [
                "Foxfire Run",
                "Acorn Memory"
            ]
        },

        winter: {
            name: "Frostmoon Isle",
            shortName: "Winter",
            background: 0x5c7897,
            ground: 0xdceaf2,
            accent: 0x91c9e8,
            secondary: 0xeaf8ff,
            dark: 0x38526b,
            challengeNames: [
                "Lantern Rhythm",
                "Moonlight Sequence"
            ]
        }

    };

    return data[season];
}


/* ============================================================
   ISLAND LANDSCAPE
   ============================================================ */

function createIslandLandscape(
    season,
    data
) {

    const island =
        trackWorld(
            scene.add.graphics()
        );

    island.fillStyle(
        data.ground,
        1
    );

    island.fillEllipse(
        950,
        640,
        1650,
        950
    );

    island.lineStyle(
        9,
        data.dark,
        0.45
    );

    island.strokeEllipse(
        950,
        640,
        1650,
        950
    );

    island.setDepth(-5);


    /* central clearing */

    const clearing =
        trackWorld(
            scene.add.graphics()
        );

    clearing.fillStyle(
        0xffffff,
        0.12
    );

    clearing.fillEllipse(
        950,
        620,
        650,
        390
    );

    clearing.setDepth(-2);


    /* paths */

    createPath(
        950,
        700,
        1100,
        55
    );

    createPath(
        950,
        600,
        55,
        800
    );


    /* seasonal atmosphere */

    if (season === "spring") {

        for (let i = 0; i < 12; i++) {

            createCherryTree(
                Phaser.Math.Between(250, 1650),
                Phaser.Math.Between(280, 980),
                Phaser.Math.FloatBetween(
                    0.65,
                    0.95
                )
            );
        }

    } else if (season === "autumn") {

        for (let i = 0; i < 12; i++) {

            createAutumnTree(
                Phaser.Math.Between(250, 1650),
                Phaser.Math.Between(280, 980),
                Phaser.Math.FloatBetween(
                    0.65,
                    0.95
                )
            );
        }

    } else {

        for (let i = 0; i < 11; i++) {

            createPineTree(
                Phaser.Math.Between(250, 1650),
                Phaser.Math.Between(280, 980),
                Phaser.Math.FloatBetween(
                    0.65,
                    0.95
                )
            );
        }
    }
}


/* ============================================================
   ISLAND DECORATIONS / OBSTACLES
   ============================================================ */

function createIslandDecorations(
    season,
    data
) {

    obstacles =
        scene.physics.add.staticGroup();


    const rockPositions = [
        [220, 410],
        [300, 850],
        [430, 1020],
        [1550, 410],
        [1680, 820],
        [1530, 1020],
        [720, 340],
        [1180, 350]
    ];

    rockPositions.forEach(
        ([x, y]) => {

            createRock(
                x,
                y,
                Phaser.Math.Between(
                    18,
                    30
                )
            );
        }
    );


    if (season === "spring") {

        for (let i = 0; i < 15; i++) {

            createFlowerPatch(
                Phaser.Math.Between(
                    250,
                    1650
                ),
                Phaser.Math.Between(
                    300,
                    1000
                ),
                i % 2
                    ? data.accent
                    : data.secondary
            );
        }

    } else if (season === "autumn") {

        for (let i = 0; i < 18; i++) {

            createLeafPile(
                Phaser.Math.Between(
                    250,
                    1650
                ),
                Phaser.Math.Between(
                    300,
                    1000
                )
            );
        }

    } else {

        for (let i = 0; i < 16; i++) {

            createSnowMounds(
                Phaser.Math.Between(
                    250,
                    1650
                ),
                Phaser.Math.Between(
                    350,
                    1000
                )
            );
        }
    }
}


/* ============================================================
   ISLAND PLAYER
   ============================================================ */

function createIslandPlayer(
    x,
    y
) {

    createPlayer(
        x,
        y
    );
}


/* ============================================================
   CHALLENGE PORTALS
   ============================================================ */

function createChallengePortal(
    season,
    x,
    y,
    index
) {

    const data =
        getSeasonData(season);

    const completed =
        gameState.completed[
            season
        ][index];


    const g =
        trackWorld(
            scene.add.graphics()
        );

    g.setDepth(5);


    /* shrine base */

    g.fillStyle(
        0x314d52,
        1
    );

    g.fillRoundedRect(
        x - 130,
        y - 95,
        260,
        190,
        28
    );


    /* outer frame */

    g.lineStyle(
        6,
        completed
            ? 0xe9d58b
            : data.accent,
        1
    );

    g.strokeRoundedRect(
        x - 130,
        y - 95,
        260,
        190,
        28
    );


    /* inner portal */

    g.fillStyle(
        completed
            ? 0xe9d58b
            : data.accent,
        0.2
    );

    g.fillEllipse(
        x,
        y - 5,
        120,
        120
    );

    g.lineStyle(
        5,
        completed
            ? 0xf6e5a6
            : data.secondary,
        1
    );

    g.strokeEllipse(
        x,
        y - 5,
        120,
        120
    );


    /* crystal */

    g.fillStyle(
        completed
            ? 0xf5df8a
            : 0x718184,
        1
    );

    g.beginPath();

    g.moveTo(
        x,
        y - 45
    );

    g.lineTo(
        x + 18,
        y - 5
    );

    g.lineTo(
        x,
        y + 35
    );

    g.lineTo(
        x - 18,
        y - 5
    );

    g.closePath();

    g.fillPath();


    const title =
        trackWorld(
            scene.add.text(
                x,
                y + 125,
                data.challengeNames[index],
                {
                    fontFamily: "Georgia",
                    fontSize: "21px",
                    fontStyle: "bold",
                    color: "#fff4d2",
                    stroke: "#233f45",
                    strokeThickness: 5,
                    align: "center"
                }
            )
        );

    title.setOrigin(0.5);
    title.setDepth(7);


    const subtitle =
        trackWorld(
            scene.add.text(
                x,
                y + 153,
                completed
                    ? "Crystal awakened"
                    : `Challenge ${index + 1}`,
                {
                    fontFamily: "Georgia",
                    fontSize: "13px",
                    color: completed
                        ? "#f5dc92"
                        : "#cfe3dc"
                }
            )
        );

    subtitle.setOrigin(0.5);
    subtitle.setDepth(7);


    const zone =
        createInteractionZone(
            x,
            y,
            270,
            220
        );

    zone.setData(
        "interaction",
        {
            type: "challenge",
            season,
            index,
            label: completed
                ? "Crystal restored"
                : `Enter ${data.challengeNames[index]}`
        }
    );
}


/* ============================================================
   SEASON GUARDIAN
   ============================================================ */

function createSeasonGuardian(
    season,
    x,
    y,
    data
) {

    const g =
        trackWorld(
            scene.add.graphics()
        );

    g.setDepth(6);


    /* glowing circle */

    g.fillStyle(
        data.accent,
        0.12
    );

    g.fillCircle(
        x,
        y,
        95
    );

    g.lineStyle(
        3,
        data.accent,
        0.55
    );

    g.strokeCircle(
        x,
        y,
        70
    );


    /* spirit */

    g.fillStyle(
        0xf6dfb0,
        1
    );

    g.fillEllipse(
        x,
        y,
        52,
        64
    );


    /* ears */

    g.fillStyle(
        data.accent,
        1
    );

    g.fillTriangle(
        x - 22,
        y - 20,
        x - 42,
        y - 48,
        x - 8,
        y - 30
    );

    g.fillTriangle(
        x + 22,
        y - 20,
        x + 42,
        y - 48,
        x + 8,
        y - 30
    );


    /* eyes */

    g.fillStyle(
        data.dark,
        1
    );

    g.fillCircle(
        x - 10,
        y - 4,
        3
    );

    g.fillCircle(
        x + 10,
        y - 4,
        3
    );


    /* seasonal symbol */

    g.fillStyle(
        data.secondary,
        1
    );

    g.fillCircle(
        x,
        y + 17,
        7
    );
}


/* ============================================================
   RETURN GATE
   ============================================================ */

function createReturnGate(
    x,
    y
) {

    const g =
        trackWorld(
            scene.add.graphics()
        );

    g.setDepth(5);

    g.fillStyle(
        0x304e53,
        1
    );

    g.fillRoundedRect(
        x - 100,
        y - 65,
        200,
        130,
        28
    );

    g.lineStyle(
        5,
        0xf1d18b,
        1
    );

    g.strokeRoundedRect(
        x - 100,
        y - 65,
        200,
        130,
        28
    );

    g.fillStyle(
        0xf1d18b,
        0.18
    );

    g.fillEllipse(
        x,
        y,
        80,
        70
    );


    const text =
        trackWorld(
            scene.add.text(
                x,
                y + 95,
                "Return to Everbloom Bay",
                {
                    fontFamily: "Georgia",
                    fontSize: "18px",
                    fontStyle: "bold",
                    color: "#fff1c8",
                    stroke: "#233f45",
                    strokeThickness: 5,
                    align: "center"
                }
            )
        );

    text.setOrigin(0.5);
    text.setDepth(7);


    const zone =
        createInteractionZone(
            x,
            y,
            220,
            160
        );

    zone.setData(
        "interaction",
        {
            type: "return",
            label: "Return to Everbloom Bay"
        }
    );
}


/* ============================================================
   RETURN TO HUB
   ============================================================ */

function returnToHub() {

    buildHub();

    if (gameState.crystals === 3) {

        showVictory();

        return;
    }

    showToast(
        "The other seasons are waiting for you"
    );
}


/* ============================================================
   CRYSTAL SYSTEM
   ============================================================ */

function syncCrystals() {

    gameState.crystals =
        Object.values(
            gameState.crystalAwarded
        ).filter(Boolean).length;

    updateHUD();
}


function checkSeasonCompletion(
    season
) {

    const completed =
        gameState.completed[season];

    if (
        completed[0] &&
        completed[1] &&
        !gameState.crystalAwarded[season]
    ) {

        gameState.crystalAwarded[season] =
            true;

        gameState.crystals++;

        gameState.score += 300;

        updateHUD();

        showToast(
            `${getSeasonData(season).shortName} Crystal restored!`
        );

        if (gameState.crystals === 3) {

            gameState.objective =
                "All three crystals restored";

            updateHUD();

            scene.time.delayedCall(
                1000,
                () => {

                    buildHub();

                    showVictory();
                }
            );
        }
    }
}


/* ============================================================
   VICTORY
   ============================================================ */

function showVictory() {

    const existing =
        document.getElementById(
            "victory-overlay"
        );

    if (existing) {
        existing.remove();
    }

    const overlay =
        document.createElement("div");

    overlay.id =
        "victory-overlay";

    overlay.className =
        "overlay";

    overlay.innerHTML = `
        <div class="panel">
            <div class="eyebrow">
                Everbloom Restored
            </div>

            <h2>
                The Isles Are Alive Again
            </h2>

            <p>
                You restored Spring, Autumn and Winter
                and awakened all three Seasonal Crystals.
            </p>

            <p>
                Final Score:
                <strong>${gameState.score}</strong>
            </p>

            <button id="victory-replay">
                Play Again
            </button>
        </div>
    `;

    document
        .getElementById("game-shell")
        .appendChild(overlay);

    document
        .getElementById("victory-replay")
        .addEventListener(
            "click",
            () => {

                overlay.remove();

                restartGame();
            }
        );
}


/* ============================================================
   CHALLENGE SYSTEM — START
   ============================================================ */

function openChallenge(
    season,
    index
) {

    const alreadyDone =
        gameState.completed[
            season
        ][index];

    if (alreadyDone) {

        showToast(
            "This challenge has already been completed"
        );

        return;
    }

    gameState.mode = "challenge";

    gameState.paused = false;

    interactionPrompt.classList.remove(
        "visible"
    );

    const data =
        getSeasonData(season);

    if (season === "spring") {

        if (index === 0) {
            startPetalPath();
        } else {
            startFireflyChase();
        }

    } else if (season === "autumn") {

        if (index === 0) {
            startFoxfireRun();
        } else {
            startAcornMemory();
        }

    } else {

        if (index === 0) {
            startLanternRhythm();
        } else {
            startMoonlightSequence();
        }
    }
}


/* ============================================================
   CHALLENGE CLEANUP
   ============================================================ */

function challengeAdd(object) {

    if (object) {
        challengeObjects.push(object);
    }

    return object;
}


function challengeTween(config) {

    const tween =
        scene.tweens.add(config);

    challengeTweens.push(tween);

    return tween;
}


function challengeTimer(config) {

    const timer =
        scene.time.addEvent(config);

    challengeTimers.push(timer);

    return timer;
}


function cleanupChallenge() {

    challengeTimers.forEach(
        timer => {

            if (timer) {
                timer.remove(false);
            }

        }
    );

    challengeTimers = [];


    challengeTweens.forEach(
        tween => {

            if (tween) {
                tween.stop();
            }

        }
    );

    challengeTweens = [];


    challengeObjects.forEach(
        object => {

            if (
                object &&
                object.destroy
            ) {

                object.destroy();
            }

        }
    );

    challengeObjects = [];


    challengeState = null;
    challengeUI = null;

    gameState.mode =
        gameState.island === "hub"
            ? "hub"
            : "island";
}


/* ============================================================
   CHALLENGE UI
   ============================================================ */

function getChallengeControls(title) {

    const controls = {
        "Petal Path": "Controls: WASD or Arrow Keys to move.",
        "Firefly Chase": "Controls: click the fireflies.",
        "Foxfire Run": "Controls: Left and Right Arrow Keys to switch paths.",
        "Acorn Memory": "Controls: click two cards to reveal a pair.",
        "Lantern Rhythm": "Controls: press SPACE when the moonlight reaches the lantern.",
        "Moonlight Sequence": "Controls: click the lantern pads in the shown order."
    };

    return controls[title] || "Controls: follow the on-screen prompts.";
}

function createChallengeShell(
    season,
    title,
    instruction
) {

    const w =
        scene.scale.width;

    const h =
        scene.scale.height;

    const data =
        getSeasonData(season);


    const panelW =
        Math.min(
            1040,
            w - 36
        );

    const panelH =
        Math.min(
            660,
            h - 28
        );

    const panelX =
        w / 2;

    const panelY =
        h / 2;


    /* dark screen overlay */

    const shade =
        challengeAdd(
            scene.add.rectangle(
                panelX,
                panelY,
                w,
                h,
                0x071a21,
                0.82
            )
        );

    shade.setScrollFactor(0);
    shade.setDepth(100);


    /* panel */

    const panel =
        challengeAdd(
            scene.add.graphics()
        );

    panel.setScrollFactor(0);
    panel.setDepth(101);


    panel.fillStyle(
        data.dark,
        0.98
    );

    panel.fillRoundedRect(
        panelX - panelW / 2,
        panelY - panelH / 2,
        panelW,
        panelH,
        32
    );


    /* scenic inner background */

    drawChallengeScenery(
        season,
        panel,
        panelX,
        panelY,
        panelW,
        panelH
    );


    /* panel border */

    panel.lineStyle(
        5,
        data.accent,
        0.9
    );

    panel.strokeRoundedRect(
        panelX - panelW / 2,
        panelY - panelH / 2,
        panelW,
        panelH,
        32
    );


    /* title */

    const titleText =
        challengeAdd(
            scene.add.text(
                panelX,
                panelY - panelH / 2 + 38,
                title,
                {
                    fontFamily: "Georgia",
                    fontSize: "30px",
                    fontStyle: "bold",
                    color: "#fff4d3",
                    stroke: "#203b42",
                    strokeThickness: 6
                }
            )
        );

    titleText.setOrigin(0.5);
    titleText.setScrollFactor(0);
    titleText.setDepth(104);


    /* instruction */

    const instructionText =
        challengeAdd(
            scene.add.text(
                panelX,
                panelY - panelH / 2 + 76,
                instruction,
                {
                    fontFamily: "Georgia",
                    fontSize: "15px",
                    color: "#d8eee7",
                    align: "center",
                    wordWrap: {
                        width: panelW - 150
                    }
                }
            )
        );

    instructionText.setOrigin(0.5);
    instructionText.setScrollFactor(0);
    instructionText.setDepth(104);


    /* status */

    const status =
        challengeAdd(
            scene.add.text(
                panelX - panelW / 2 + 45,
                panelY - panelH / 2 + 112,
                "",
                {
                    fontFamily: "Georgia",
                    fontSize: "16px",
                    fontStyle: "bold",
                    color: "#ffe4a2"
                }
            )
        );

    status.setScrollFactor(0);
    status.setDepth(104);


    /* timer */

    const timer =
        challengeAdd(
            scene.add.text(
                panelX + panelW / 2 - 45,
                panelY - panelH / 2 + 112,
                "",
                {
                    fontFamily: "Georgia",
                    fontSize: "16px",
                    fontStyle: "bold",
                    color: "#d8f2ee"
                }
            )
        );

    timer.setOrigin(1, 0);
    timer.setScrollFactor(0);
    timer.setDepth(104);
    timer.setText("TIME  --");


    /* play area */

    const playW =
        Math.min(
            900,
            panelW - 100
        );

    const playH =
        Math.min(
            405,
            panelH - 225
        );

    const playX =
        panelX;

    const playY =
        panelY + 15;


    const play =
        challengeAdd(
            scene.add.graphics()
        );

    play.setScrollFactor(0);
    play.setDepth(102);

    play.fillStyle(
        0x102c35,
        0.38
    );

    play.fillRoundedRect(
        playX - playW / 2,
        playY - playH / 2,
        playW,
        playH,
        24
    );

    play.lineStyle(
        3,
        data.accent,
        0.65
    );

    play.strokeRoundedRect(
        playX - playW / 2,
        playY - playH / 2,
        playW,
        playH,
        24
    );

    const playMask =
        scene.make.graphics({
            x: 0,
            y: 0,
            add: false
        });

    playMask.fillStyle(0xffffff);
    playMask.fillRoundedRect(
        playX - playW / 2 + 10,
        playY - playH / 2 + 10,
        playW - 20,
        playH - 20,
        18
    );

    const playGeometryMask =
        playMask.createGeometryMask();

    challengeObjects.push(playMask);


    const briefingShade =
        challengeAdd(
            scene.add.rectangle(
                panelX,
                panelY + 8,
                panelW - 90,
                panelH - 190,
                0x102c35,
                0.97
            )
        );

    briefingShade.setStrokeStyle(
        3,
        data.accent,
        0.95
    );

    briefingShade.setScrollFactor(0);
    briefingShade.setDepth(108);

    const briefingTitle =
        challengeAdd(
            scene.add.text(
                panelX,
                panelY - 82,
                "HOW TO PLAY",
                {
                    fontFamily: "Georgia",
                    fontSize: "23px",
                    fontStyle: "bold",
                    color: "#fff4d3",
                    stroke: "#203b42",
                    strokeThickness: 5
                }
            )
        );

    briefingTitle.setOrigin(0.5);
    briefingTitle.setScrollFactor(0);
    briefingTitle.setDepth(109);

    const briefingText =
        challengeAdd(
            scene.add.text(
                panelX,
                panelY - 22,
                `${instruction}\n\n${getChallengeControls(title)}\n\nThe timer starts when you press Begin Challenge.`,
                {
                    fontFamily: "Georgia",
                    fontSize: "17px",
                    color: "#d8eee7",
                    align: "center",
                    wordWrap: {
                        width: panelW - 170
                    }
                }
            )
        );

    briefingText.setOrigin(0.5);
    briefingText.setScrollFactor(0);
    briefingText.setDepth(109);


    /* leave button */

    const button =
        challengeAdd(
            scene.add.rectangle(
                panelX,
                panelY + panelH / 2 - 38,
                170,
                36,
                0x355e64,
                1
            )
        );

    button.setStrokeStyle(
        2,
        0xd8c27d,
        0.75
    );

    button.setInteractive({
        useHandCursor: true
    });

    button.setScrollFactor(0);
    button.setDepth(110);


    const buttonText =
        challengeAdd(
            scene.add.text(
                panelX,
                panelY + panelH / 2 - 38,
                "Leave Challenge",
                {
                    fontFamily: "Georgia",
                    fontSize: "14px",
                    fontStyle: "bold",
                    color: "#fff1cb"
                }
            )
        );

    buttonText.setOrigin(0.5);
    buttonText.setScrollFactor(0);
    buttonText.setDepth(111);


    button.on(
        "pointerover",
        () => button.setFillStyle(
            0x47777a
        )
    );

    button.on(
        "pointerout",
        () => button.setFillStyle(
            0x355e64
        )
    );

    button.on(
        "pointerdown",
        leaveChallenge
    );


    const beginButton =
        challengeAdd(
            scene.add.rectangle(
                panelX,
                panelY + panelH / 2 - 82,
                190,
                36,
                0xf1d18b,
                1
            )
        );

    beginButton.setStrokeStyle(
        2,
        0xfff4d3,
        0.9
    );

    beginButton.setInteractive({
        useHandCursor: true
    });

    beginButton.setScrollFactor(0);
    beginButton.setDepth(110);

    const beginText =
        challengeAdd(
            scene.add.text(
                panelX,
                panelY + panelH / 2 - 82,
                "Begin Challenge",
                {
                    fontFamily: "Georgia",
                    fontSize: "14px",
                    fontStyle: "bold",
                    color: "#203b42"
                }
            )
        );

    beginText.setOrigin(0.5);
    beginText.setScrollFactor(0);
    beginText.setDepth(111);

    const helpButton =
        challengeAdd(
            scene.add.rectangle(
                panelX + panelW / 2 - 58,
                panelY - panelH / 2 + 38,
                86,
                30,
                0x355e64,
                1
            )
        );

    helpButton.setStrokeStyle(
        2,
        0xd8c27d,
        0.75
    );

    helpButton.setInteractive({
        useHandCursor: true
    });

    helpButton.setScrollFactor(0);
    helpButton.setDepth(110);

    const helpText =
        challengeAdd(
            scene.add.text(
                helpButton.x,
                helpButton.y,
                "HELP",
                {
                    fontFamily: "Georgia",
                    fontSize: "13px",
                    fontStyle: "bold",
                    color: "#fff1cb"
                }
            )
        );

    helpText.setOrigin(0.5);
    helpText.setScrollFactor(0);
    helpText.setDepth(111);


    challengeUI = {
        panelX,
        panelY,
        panelW,
        panelH,

        playX,
        playY,
        playW,
        playH,
        playMask: playGeometryMask,

        status,
        timer,
        title: titleText,
        started: false,
        helpOpen: true,
        beginButton,
        beginText,
        briefingObjects: [
            briefingShade,
            briefingTitle,
            briefingText
        ],
        helpButton,
        helpText
    };

    challengeTween({
        targets: panel,
        scale: {
            from: 0.96,
            to: 1
        },
        duration: 360,
        ease: "Back.easeOut"
    });

    function setHelpVisible(visible) {

        challengeUI.helpOpen = visible;

        challengeUI.briefingObjects.forEach(
            object => object.setVisible(visible)
        );

        challengeUI.beginButton.setVisible(
            visible || !challengeUI.started
        );

        challengeUI.beginText.setVisible(
            visible || !challengeUI.started
        );

        challengeUI.beginText.setText(
            challengeUI.started
                ? "Resume Game"
                : "Begin Challenge"
        );

        if (
            challengeUI.started &&
            visible
        ) {
            challengeUI.beginButton.setInteractive({
                useHandCursor: true
            });
        } else if (challengeUI.started) {
            challengeUI.beginButton.disableInteractive();
        }
    }

    beginButton.on(
        "pointerdown",
        () => {

            if (
                !challengeState
            ) {
                return;
            }

            if (challengeUI.started) {
                setHelpVisible(false);
                return;
            }

            challengeUI.started = true;
            challengeState.started = true;

            setHelpVisible(false);

            challengeUI.timer.setText(`TIME  ${challengeState.timeLeft.toFixed(1)}s`);

            beginButton.disableInteractive();
            beginButton.setAlpha(0.55);
            beginText.setText("Challenge Started");

            if (
                typeof challengeState.onStart ===
                "function"
            ) {
                challengeState.onStart();
            }
        }
    );

    helpButton.on(
        "pointerdown",
        () => setHelpVisible(!challengeUI.helpOpen)
    );

    return challengeUI;
}


/* ============================================================
   SCENIC CHALLENGE BACKGROUND
   ============================================================ */

function drawChallengeScenery(
    season,
    graphics,
    x,
    y,
    w,
    h
) {

    const left =
        x - w / 2;

    const top =
        y - h / 2;


    if (season === "spring") {

        graphics.fillStyle(
            0x6e9e91,
            0.45
        );

        graphics.fillRect(
            left + 10,
            top + 10,
            w - 20,
            h - 20
        );


        /* moon */

        graphics.fillStyle(
            0xffe9c0,
            0.8
        );

        graphics.fillCircle(
            left + w - 100,
            top + 105,
            42
        );


        /* hills */

        graphics.fillStyle(
            0x8cbd8d,
            0.75
        );

        graphics.fillEllipse(
            left + 180,
            top + h - 90,
            450,
            180
        );

        graphics.fillEllipse(
            left + w - 150,
            top + h - 80,
            520,
            200
        );


        /* blossoms */

        for (let i = 0; i < 24; i++) {

            graphics.fillStyle(
                i % 2
                    ? 0xf1b4c9
                    : 0xffe0a1,
                0.7
            );

            graphics.fillCircle(
                Phaser.Math.Between(
                    left + 40,
                    left + w - 40
                ),
                Phaser.Math.Between(
                    top + 120,
                    top + h - 30
                ),
                Phaser.Math.Between(
                    3,
                    7
                )
            );
        }

    } else if (season === "autumn") {

        graphics.fillStyle(
            0x7d4c40,
            0.45
        );

        graphics.fillRect(
            left + 10,
            top + 10,
            w - 20,
            h - 20
        );


        /* moon */

        graphics.fillStyle(
            0xffdf9a,
            0.8
        );

        graphics.fillCircle(
            left + w - 110,
            top + 105,
            45
        );


        /* distant hills */

        graphics.fillStyle(
            0x5f4a43,
            0.65
        );

        graphics.fillEllipse(
            left + 190,
            top + h - 70,
            500,
            190
        );

        graphics.fillEllipse(
            left + w - 170,
            top + h - 65,
            540,
            200
        );


        /* falling leaves */

        const leafColors = [
            0xe26f35,
            0xf0a247,
            0xc95234,
            0xe7c05c
        ];

        for (let i = 0; i < 28; i++) {

            graphics.fillStyle(
                leafColors[
                    i % leafColors.length
                ],
                0.8
            );

            graphics.fillEllipse(
                Phaser.Math.Between(
                    left + 35,
                    left + w - 35
                ),
                Phaser.Math.Between(
                    top + 115,
                    top + h - 30
                ),
                10,
                6
            );
        }

    } else {

        graphics.fillStyle(
            0x304b69,
            0.55
        );

        graphics.fillRect(
            left + 10,
            top + 10,
            w - 20,
            h - 20
        );


        /* moon */

        graphics.fillStyle(
            0xe8f6ff,
            0.9
        );

        graphics.fillCircle(
            left + w - 105,
            top + 100,
            48
        );


        /* mountains */

        graphics.fillStyle(
            0x4b6986,
            0.9
        );

        graphics.beginPath();

        graphics.moveTo(
            left + 20,
            top + h - 50
        );

        graphics.lineTo(
            left + 200,
            top + 240
        );

        graphics.lineTo(
            left + 360,
            top + h - 50
        );

        graphics.closePath();

        graphics.fillPath();


        graphics.beginPath();

        graphics.moveTo(
            left + 280,
            top + h - 50
        );

        graphics.lineTo(
            left + 520,
            top + 200
        );

        graphics.lineTo(
            left + 760,
            top + h - 50
        );

        graphics.closePath();

        graphics.fillPath();


        /* snow */

        graphics.fillStyle(
            0xe8f5fb,
            0.75
        );

        graphics.fillTriangle(
            left + 200,
            top + 240,
            left + 160,
            top + 300,
            left + 240,
            top + 300
        );

        graphics.fillTriangle(
            left + 520,
            top + 200,
            left + 470,
            top + 270,
            left + 570,
            top + 270
        );


        /* stars */

        for (let i = 0; i < 28; i++) {

            graphics.fillStyle(
                0xd9f4ff,
                Phaser.Math.FloatBetween(
                    0.4,
                    0.9
                )
            );

            graphics.fillCircle(
                Phaser.Math.Between(
                    left + 40,
                    left + w - 40
                ),
                Phaser.Math.Between(
                    top + 80,
                    top + 280
                ),
                Phaser.Math.Between(
                    2,
                    4
                )
            );
        }
    }
}


/* ============================================================
   LEAVE CHALLENGE
   ============================================================ */

function leaveChallenge() {

    if (gameState.mode !== "challenge") {
        return;
    }

    cleanupChallenge();

    buildIsland(
        gameState.island
    );

    showToast(
        "Challenge left. Your progress is safe."
    );
}


/* ============================================================
   CHALLENGE COMPLETION
   ============================================================ */

function completeChallenge(
    season,
    index
) {

    gameState.completed[
        season
    ][index] = true;

    gameState.score += 150;

    gameState.lives = 3;

    updateHUD();

    cleanupChallenge();

    checkSeasonCompletion(
        season
    );

    if (gameState.crystals === 3) {
        return;
    }

    buildIsland(
        season
    );

    showToast(
        `${getSeasonData(season).challengeNames[index]} complete!`
    );
}


function failChallenge(
    message = "The challenge slipped away"
) {

    cleanupChallenge();

    gameState.lives = 3;

    buildIsland(
        gameState.island
    );

    showToast(
        message
    );
}


/* ============================================================
   CHALLENGE UPDATE DISPATCHER
   ============================================================ */

function updateChallenge(delta) {

    if (
        !challengeState ||
        !challengeUI ||
        !challengeUI.started ||
        challengeUI.helpOpen
    ) {
        return;
    }

    if (
        typeof challengeState.update ===
        "function"
    ) {

        challengeState.update(
            delta
        );
    }
}

/* ============================================================
   PART 2 — THE SIX SEASONAL MINI-GAMES
   ============================================================ */


/* ============================================================
   HELPER — CHALLENGE TIMER
   ============================================================ */

function updateChallengeTimer(
    delta,
    limit,
    onExpire
) {

    if (!challengeState) return true;

    challengeState.timeLeft -=
        delta / 1000;

    challengeUI.timer.setText(`TIME  ${Math.max(
            0,
            challengeState.timeLeft
        ).toFixed(1)}s`);

    if (
        challengeState.timeLeft <= 0
    ) {

        if (typeof onExpire === "function") {
            onExpire();
        } else {
            failChallenge(
                "Time ran out. Try again!"
            );
        }

        return false;
    }

        return true;
}


/* ============================================================
   HELPER - CREATE SMALL GLOW
   ============================================================ */

function createGlow(
    x,
    y,
    radius,
    color,
    alpha = 0.25
) {

    const glow =
        challengeAdd(
            scene.add.circle(
                x,
                y,
                radius,
                color,
                alpha
            )
        );
    glow.setScrollFactor(0);
    glow.setDepth(103);

    return glow;
}


/* ============================================================
   HELPER - CREATE PETAL
   ============================================================ */

function createPetal(
    x,
    y,
    color
) {

    const petal =
        challengeAdd(
            scene.add.graphics()
        );

    petal.setPosition(
        x,
        y
    );

    petal.setDepth(104);
    petal.setMask(challengeUI.playMask);

    petal.fillStyle(
        color,
        1
    );

    petal.fillEllipse(
        -7,
        0,
        14,
        8
    );

    petal.fillEllipse(
        7,
        0,
        14,
        8
    );

    petal.fillEllipse(
        0,
        -7,
        8,
        14
    );

    petal.fillEllipse(
        0,
        7,
        8,
        14
    );

    petal.fillStyle(
        0xffdf8b,
        1
    );

    petal.fillCircle(
        0,
        0,
        5
    );

    return petal;
}


/* ============================================================
   SPRING GAME 1
   PETAL PATH
   ============================================================ */

function startPetalPath() {

    const ui =
        createChallengeShell(
            "spring",
            "Petal Path",
            "Goal: collect all 10 petals in 30 seconds. Each petal is worth 10 points; completion awards 150 bonus points."
        );


    challengeState = {

        season: "spring",

        game: "petal",

        timeLeft: 30,

        collected: 0,

        total: 10,

        speed: 230,

        petals: [],

        bounds: {
            minX: ui.playX - ui.playW / 2 + 34,
            maxX: ui.playX + ui.playW / 2 - 34,
            minY: ui.playY - ui.playH / 2 + 34,
            maxY: ui.playY + ui.playH / 2 - 34
        },

        spirit: null,

        update: null
    };


    /* --------------------------------------------------------
       Spirit
       -------------------------------------------------------- */

    const spirit =
        challengeAdd(
            scene.add.container(
                ui.playX,
                ui.playY + ui.playH / 2 - 45
            )
        );

    spirit.setScrollFactor(0);
    spirit.setDepth(106);
    spirit.setMask(ui.playMask);

    const spiritGlow =
        scene.add.circle(
            0,
            0,
            25,
            0xf3c5d6,
            0.22
        );

    const spiritBody =
        scene.add.graphics();

    spiritBody.fillStyle(
        0xf1d0a9,
        1
    );

    spiritBody.fillCircle(
        0,
        -7,
        15
    );

    spiritBody.fillStyle(
        0x739d82,
        1
    );

    spiritBody.fillTriangle(
        -18,
        3,
        0,
        28,
        18,
        3
    );
    spiritBody.fillStyle(
        0x332d39,
        1
    );

    spiritBody.fillCircle(
        -5,
        -9,
        2
    );

    spiritBody.fillCircle(
        5,
        -9,
        2
    );

    spirit.add([
        spiritGlow,
        spiritBody
    ]);

    challengeState.spirit =
        spirit;


    /* --------------------------------------------------------
       Petals
       -------------------------------------------------------- */

    const petalColors = [
        0xe99db8,
        0xf2b5ca,
        0xffd58a,
        0xf5d6e1
    ];


    for (
        let i = 0;
        i < challengeState.total;
        i++
    ) {

        const x =
            Phaser.Math.Between(
                challengeState.bounds.minX,
                challengeState.bounds.maxX
            );

        const y =
            Phaser.Math.Between(
                challengeState.bounds.minY,
                challengeState.bounds.maxY
            );

        const petal =
            createPetal(
                x,
                y,
                petalColors[
                    i % petalColors.length
                ]
            );

        petal.setData(
            "vx",
            Phaser.Math.FloatBetween(
                -25,
                25
            )
        );

        petal.setData(
            "vy",
            Phaser.Math.FloatBetween(
                -20,
                20
            )
        );

        petal.setData(
            "phase",
            Phaser.Math.FloatBetween(
                0,
                Math.PI * 2
            )
        );

        challengeState.petals.push(
            petal
        );
    }


    challengeUI.status.setText("PETALS  0 / 10");


    /* --------------------------------------------------------
       Update
       -------------------------------------------------------- */

    challengeState.update =
        function(delta) {

            if (
                !updateChallengeTimer(
                    delta,
                    30
                )
            ) {
                return;
            }


            let vx = 0;
            let vy = 0;


            if (
                cursors.left.isDown ||
                wasd.left.isDown
            ) {
                vx -= 1;
            }

            if (
                cursors.right.isDown ||
                wasd.right.isDown
            ) {
                vx += 1;
            }

            if (
                cursors.up.isDown ||
                wasd.up.isDown
            ) {
                vy -= 1;
            }

            if (
                cursors.down.isDown ||
                wasd.down.isDown
            ) {
                vy += 1;
            }


            if (
                vx !== 0 ||
                vy !== 0
            ) {

                const length =
                    Math.sqrt(
                        vx * vx +
                        vy * vy
                    );

                vx /= length;
                vy /= length;

                spirit.x +=
                    vx *
                    challengeState.speed *
                    delta /
                    1000;

                spirit.y +=
                    vy *
                    challengeState.speed *
                    delta /
                    1000;
            }


            const minX = challengeState.bounds.minX;
            const maxX = challengeState.bounds.maxX;
            const minY = challengeState.bounds.minY;
            const maxY = challengeState.bounds.maxY;


            spirit.x =
                Phaser.Math.Clamp(
                    spirit.x,
                    minX,
                    maxX
                );

            spirit.y =
                Phaser.Math.Clamp(
                    spirit.y,
                    minY,
                    maxY
                );


            /* drifting petals */

            challengeState.petals =
                challengeState.petals.filter(
                    petal => {

                        if (
                            !petal ||
                            !petal.active
                        ) {
                            return false;
                        }

                        const phase =
                            petal.getData(
                                "phase"
                            );

                        petal.x +=
                            petal.getData("vx") *
                            delta /
                            1000;

                        petal.y +=
                            petal.getData("vy") *
                            delta /
                            1000;

                        petal.y +=
                            Math.sin(
                                phase +
                                performance.now() *
                                0.001
                            ) *
                            0.15;


                        if (
                            petal.x <
                            minX
                        ) {
                            petal.x = minX;
                        }

                        if (
                            petal.x >
                            maxX
                        ) {
                            petal.x = maxX;
                        }

                        if (
                            petal.y <
                            minY
                        ) {
                            petal.y = minY;
                        }

                        if (
                            petal.y >
                            maxY
                        ) {
                            petal.y = maxY;
                        }


                        const distance =
                            Phaser.Math.Distance.Between(
                                spirit.x,
                                spirit.y,
                                petal.x,
                                petal.y
                            );


                        if (
                            distance < 34
                        ) {

                            petal.destroy();

                            challengeState.collected++;

                            challengeUI.status.setText(`PETALS  ${challengeState.collected} / 10`);

                            gameState.score += 10;

                            if (
                                challengeState.collected >=
                                challengeState.total
                            ) {

                                completeChallenge(
                                    "spring",
                                    0
                                );
                            }

                            return false;
                        }

                        return true;
                    }
                );
        };
}


/* ============================================================
   SPRING GAME 2
   FIREFLY CHASE
   ============================================================ */

function startFireflyChase() {

    const ui =
        createChallengeShell(
            "spring",
            "Firefly Chase",
            "Goal: catch all 10 fireflies in 28 seconds. Each firefly is worth 12 points; completion awards 150 bonus points."
        );


    challengeState = {

        season: "spring",

        game: "firefly",

        timeLeft: 28,

        caught: 0,

        total: 10,

        fireflies: [],

        spawnCount: 0,

        update: null
    };


    challengeUI.status.setText("FIREFLIES  0 / 10");


    function spawnFirefly() {

        if (
            challengeState.spawnCount >=
            challengeState.total
        ) {
            return;
        }


        const x =
            Phaser.Math.Between(
                ui.playX - ui.playW / 2 + 35,
                ui.playX + ui.playW / 2 - 35
            );

        const y =
            Phaser.Math.Between(
                ui.playY - ui.playH / 2 + 35,
                ui.playY + ui.playH / 2 - 35
            );


        const glow =
            createGlow(
                x,
                y,
                30,
                0xffe39b,
                0.12
            );


        const firefly =
            challengeAdd(
                scene.add.circle(
                    x,
                    y,
                    9,
                    0xffe49a,
                    1
                )
            );

        firefly.setScrollFactor(0);
        firefly.setDepth(106);

        firefly.setInteractive({
            useHandCursor: true
        });


        firefly.setData(
            "vx",
            Phaser.Math.FloatBetween(
                -100,
                100
            )
        );

        firefly.setData(
            "vy",
            Phaser.Math.FloatBetween(
                -75,
                75
            )
        );

        firefly.setData(
            "glow",
            glow
        );


        firefly.on(
            "pointerdown",
            () => {

                if (
                    !firefly.active ||
                    gameState.mode !==
                    "challenge" ||
                    !challengeUI.started
                ) {
                    return;
                }

                challengeState.caught++;

                gameState.score += 12;

                if (glow) {
                    glow.destroy();
                }

                firefly.destroy();


                challengeUI.status.setText(`FIREFLIES  ${challengeState.caught} / 10`);


                if (
                    challengeState.caught >=
                    challengeState.total
                ) {

                    completeChallenge(
                        "spring",
                        1
                    );

                    return;
                }


                spawnFirefly();
            }
        );


        challengeState.fireflies.push(
            firefly
        );

        challengeState.spawnCount++;
    }


    for (
        let i = 0;
        i < 3;
        i++
    ) {
        spawnFirefly();
    }


    challengeState.update =
        function(delta) {

            if (
                !updateChallengeTimer(
                    delta,
                    28
                )
            ) {
                return;
            }


            challengeState.fireflies.forEach(
                firefly => {

                    if (
                        !firefly ||
                        !firefly.active
                    ) {
                        return;
                    }


                    let vx =
                        firefly.getData(
                            "vx"
                        );

                    let vy =
                        firefly.getData(
                            "vy"
                        );


                    firefly.x +=
                        vx *
                        delta /
                        1000;

                    firefly.y +=
                        vy *
                        delta /
                        1000;


                    const minX =
                        ui.playX -
                        ui.playW / 2 +
                        25;

                    const maxX =
                        ui.playX +
                        ui.playW / 2 -
                        25;

                    const minY =
                        ui.playY -
                        ui.playH / 2 +
                        25;

                    const maxY =
                        ui.playY +
                        ui.playH / 2 -
                        25;


                    if (
                        firefly.x < minX ||
                        firefly.x > maxX
                    ) {

                        vx *= -1;

                        firefly.setData(
                            "vx",
                            vx
                        );
                    }


                    if (
                        firefly.y < minY ||
                        firefly.y > maxY
                    ) {

                        vy *= -1;

                        firefly.setData(
                            "vy",
                            vy
                        );
                    }


                    const glow =
                        firefly.getData(
                            "glow"
                        );

                    if (
                        glow &&
                        glow.active
                    ) {

                        glow.x =
                            firefly.x;

                        glow.y =
                            firefly.y;
                    }
                }
            );
        };
}


/* ============================================================
   AUTUMN GAME 1
   FOXFIRE RUN
   ============================================================ */

function startFoxfireRun() {

    const ui =
        createChallengeShell(
            "autumn",
            "Foxfire Run",
            "Goal: survive all 24 seconds by switching paths. Avoid 3 hits; completion awards 150 bonus points."
        );


    challengeState = {

        season: "autumn",

        game: "foxrun",

        timeLeft: 24,

        survived: 0,

        targetTime: 24,

        lives: 3,

        lane: 1,

        lanes: [],

        obstacles: [],

        spawnTimer: 0,

        update: null
    };


    const laneSpacing =
        Math.min(
            210,
            ui.playW / 4
        );


    challengeState.lanes = [
        ui.playX - laneSpacing,
        ui.playX,
        ui.playX + laneSpacing
    ];


    /* --------------------------------------------------------
       Lane lines
       -------------------------------------------------------- */

    const laneGraphics =
        challengeAdd(
            scene.add.graphics()
        );

    laneGraphics.setScrollFactor(0);
    laneGraphics.setDepth(103);

    laneGraphics.lineStyle(
        2,
        0xf0c17b,
        0.28
    );

    challengeState.lanes.forEach(
        laneX => {

            laneGraphics.beginPath();

            laneGraphics.moveTo(
                laneX,
                ui.playY -
                ui.playH / 2
            );

            laneGraphics.lineTo(
                laneX,
                ui.playY +
                ui.playH / 2
            );

            laneGraphics.strokePath();
        }
    );


    /* --------------------------------------------------------
       Fox player
       -------------------------------------------------------- */

    const fox =
        challengeAdd(
            scene.add.container(
                challengeState.lanes[1],
                ui.playY +
                ui.playH / 2 -
                45
            )
        );

    fox.setScrollFactor(0);
    fox.setDepth(107);


    const foxBody =
        scene.add.graphics();

    foxBody.fillStyle(
        0xd66f3d,
        1
    );

    foxBody.fillCircle(
        0,
        0,
        20
    );

    foxBody.fillTriangle(
        -15,
        -12,
        -19,
        -35,
        -3,
        -20
    );

    foxBody.fillTriangle(
        15,
        -12,
        19,
        -35,
        3,
        -20
    );

    foxBody.fillStyle(
        0xffd4a1,
        1
    );

    foxBody.fillCircle(
        -7,
        -2,
        3
    );

    foxBody.fillCircle(
        7,
        -2,
        3
    );

    fox.add(
        foxBody
    );


    challengeState.fox =
        fox;


    challengeUI.status.setText("HEARTS  3     PATH  2");


    challengeState.update =
        function(delta) {

            if (
                !updateChallengeTimer(
                    delta,
                    24,
                    () => completeChallenge(
                        "autumn",
                        0
                    )
                )
            ) {
                return;
            }


            /* lane switching */

            if (
                Phaser.Input.Keyboard.JustDown(
                    cursors.left
                ) ||
                Phaser.Input.Keyboard.JustDown(
                    wasd.left
                )
            ) {

                challengeState.lane =
                    Math.max(
                        0,
                        challengeState.lane - 1
                    );
            }


            if (
                Phaser.Input.Keyboard.JustDown(
                    cursors.right
                ) ||
                Phaser.Input.Keyboard.JustDown(
                    wasd.right
                )
            ) {

                challengeState.lane =
                    Math.min(
                        2,
                        challengeState.lane + 1
                    );
            }


            fox.x =
                Phaser.Math.Linear(
                    fox.x,
                    challengeState.lanes[
                        challengeState.lane
                    ],
                    0.25
                );


            /* spawn */

            challengeState.spawnTimer -=
                delta;


            if (
                challengeState.spawnTimer <= 0
            ) {

                challengeState.spawnTimer =
                    Phaser.Math.Between(
                        550,
                        850
                    );


                const lane =
                    Phaser.Math.Between(
                        0,
                        2
                    );


                const debris =
                    challengeAdd(
                        scene.add.rectangle(
                            challengeState.lanes[lane],
                            ui.playY -
                            ui.playH / 2 -
                            30,
                            48,
                            28,
                            0xc85a38,
                            1
                        )
                    );

                debris.setScrollFactor(0);
                debris.setDepth(105);

                debris.setData(
                    "lane",
                    lane
                );

                challengeState.obstacles.push(
                    debris
                );
            }


            /* move debris */

            challengeState.obstacles =
                challengeState.obstacles.filter(
                    debris => {

                        if (
                            !debris ||
                            !debris.active
                        ) {
                            return false;
                        }


                        debris.y +=
                            270 *
                            delta /
                            1000;


                        if (
                            debris.y >
                            ui.playY +
                            ui.playH / 2 +
                            50
                        ) {

                            debris.destroy();

                            challengeState.survived +=
                                0.25;

                            return false;
                        }


                        const hit =
                            Phaser.Math.Distance.Between(
                                fox.x,
                                fox.y,
                                debris.x,
                                debris.y
                            ) < 32;


                        if (hit) {

                            debris.destroy();

                            challengeState.lives--;

                            challengeUI.status.setText(`HEARTS  ${challengeState.lives}     PATH  ${challengeState.lane + 1}`);


                            fox.setAlpha(
                                0.45
                            );

                            scene.time.delayedCall(
                                130,
                                () => {

                                    if (fox) {
                                        fox.setAlpha(1);
                                    }

                                }
                            );


                            if (
                                challengeState.lives <=
                                0
                            ) {

                                failChallenge(
                                    "The foxfire trail was too crowded!"
                                );

                                return false;
                            }

                            return false;
                        }

                        return true;
                    }
                );


        };
}


/* ============================================================
   AUTUMN GAME 2
   ACORN MEMORY
   ============================================================ */

function startAcornMemory() {

    const ui =
        createChallengeShell(
            "autumn",
            "Acorn Memory",
            "Goal: match all 4 pairs in 45 seconds. Each pair is worth 20 points; completion awards 150 bonus points."
        );


    challengeState = {

        season: "autumn",

        game: "memory",

        timeLeft: 45,

        cards: [],

        first: null,

        second: null,

        locked: false,

        matches: 0,

        pairs: 4,

        update: null
    };


    const symbols = [
        "A",
        "B",
        "C",
        "D"
    ];


    let deck = [
        ...symbols,
        ...symbols
    ];


    Phaser.Utils.Array.Shuffle(
        deck
    );


    const cols = 4;
    const rows = 2;

    const cardW = 115;
    const cardH = 125;

    const gap = 18;


    const totalW =
        cols * cardW +
        (cols - 1) * gap;

    const totalH =
        rows * cardH +
        (rows - 1) * gap;


    const startX =
        ui.playX -
        totalW / 2 +
        cardW / 2;

    const startY =
        ui.playY -
        totalH / 2 +
        cardH / 2;


    function revealCard(card) {

        if (
            !challengeUI.started ||
            challengeState.locked ||
            card.revealed ||
            card.matched
        ) {
            return;
        }


        card.revealed = true;

        card.back.setFillStyle(
            0xe7a05c
        );

        card.symbol.setVisible(
            true
        );


        if (
            !challengeState.first
        ) {

            challengeState.first =
                card;

            return;
        }


        challengeState.second =
            card;

        challengeState.locked = true;


        const first =
            challengeState.first;

        const second =
            challengeState.second;


        if (
            first.value ===
            second.value
        ) {

            first.matched = true;
            second.matched = true;

            challengeState.matches++;

            challengeState.locked =
                false;

            challengeState.first =
                null;

            challengeState.second =
                null;

            gameState.score += 20;

            challengeUI.status.setText(`PAIRS  ${challengeState.matches} / 4`);


            if (
                challengeState.matches >=
                challengeState.pairs
            ) {

                completeChallenge(
                    "autumn",
                    1
                );
            }

        } else {

            const timer =
                challengeTimer({
                    delay: 650,
                    callback: () => {

                        if (
                            first.back
                        ) {
                            first.back.setFillStyle(
                                0x7b4c3d
                            );
                        }

                        if (
                            second.back
                        ) {
                            second.back.setFillStyle(
                                0x7b4c3d
                            );
                        }

                        if (
                            first.symbol
                        ) {
                            first.symbol.setVisible(
                                false
                            );
                        }

                        if (
                            second.symbol
                        ) {
                            second.symbol.setVisible(
                                false
                            );
                        }


                        first.revealed =
                            false;

                        second.revealed =
                            false;

                        challengeState.first =
                            null;

                        challengeState.second =
                            null;

                        challengeState.locked =
                            false;
                    }
                });
        }
    }


    for (
        let row = 0;
        row < rows;
        row++
    ) {

        for (
            let col = 0;
            col < cols;
            col++
        ) {

            const index =
                row * cols +
                col;

            const x =
                startX +
                col *
                (cardW + gap);

            const y =
                startY +
                row *
                (cardH + gap);


            const back =
                challengeAdd(
                    scene.add.rectangle(
                        x,
                        y,
                        cardW,
                        cardH,
                        0x7b4c3d,
                        1
                    )
                );

            back.setScrollFactor(0);
            back.setDepth(105);

            back.setStrokeStyle(
                3,
                0xf0c17b,
                0.8
            );

            back.setInteractive({
                useHandCursor: true
            });


            const decorative =
                challengeAdd(
                    scene.add.graphics()
                );

            decorative.setPosition(
                x,
                y
            );

            decorative.setDepth(106);

            decorative.lineStyle(
                2,
                0xf5d18a,
                0.45
            );

            decorative.strokeCircle(
                0,
                0,
                26
            );


            const symbol =
                challengeAdd(
                    scene.add.text(
                        x,
                        y,
                        deck[index],
                        {
                            fontFamily: "Georgia",
                            fontSize: "42px",
                            fontStyle: "bold",
                            color: "#fff0c5"
                        }
                    )
                );

            symbol.setOrigin(0.5);
            symbol.setScrollFactor(0);
            symbol.setDepth(107);

            symbol.setVisible(
                false
            );


            const card = {

                value: deck[index],

                back,

                symbol,

                revealed: false,

                matched: false
            };


            challengeState.cards.push(
                card
            );


            back.on(
                "pointerdown",
                () => revealCard(card)
            );
        }
    }


    challengeUI.status.setText("PAIRS  0 / 4");


    challengeState.update =
        function(delta) {

            updateChallengeTimer(
                delta,
                45
            );
        };
}


/* ============================================================
   WINTER GAME 1
   LANTERN RHYTHM
   ============================================================ */

function startLanternRhythm() {

    const ui =
        createChallengeShell(
            "winter",
            "Lantern Rhythm",
            "Goal: land 7 moonlight hits in 28 seconds. Each hit is worth 15 points; 3 misses end the challenge."
        );


    challengeState = {

        season: "winter",

        game: "rhythm",

        timeLeft: 28,

        hits: 0,

        targetHits: 7,

        misses: 0,

        maxMisses: 3,

        rhythmPressed: false,

        orbX:
            ui.playX -
            ui.playW / 2 +
            30,

        direction: 1,

        speed: 310,

        update: null
    };


    const trackY =
        ui.playY;


    /* track */

    const track =
        challengeAdd(
            scene.add.rectangle(
                ui.playX,
                trackY,
                ui.playW - 80,
                18,
                0x9fcce0,
                0.3
            )
        );

    track.setScrollFactor(0);
    track.setDepth(104);


    /* target zone */

    const target =
        challengeAdd(
            scene.add.rectangle(
                ui.playX + 150,
                trackY,
                110,
                62,
                0xbcecff,
                0.18
            )
        );

    target.setScrollFactor(0);
    target.setDepth(105);

    target.setStrokeStyle(
        3,
        0xdff7ff,
        0.9
    );


    /* lantern symbol */

    const lantern =
        challengeAdd(
            scene.add.graphics()
        );

    lantern.setPosition(
        target.x,
        target.y
    );

    lantern.setDepth(106);

    lantern.lineStyle(
        4,
        0xdff7ff,
        1
    );

    lantern.strokeRoundedRect(
        -22,
        -24,
        44,
        48,
        10
    );

    lantern.lineStyle(
        2,
        0xdff7ff,
        0.8
    );

    lantern.lineBetween(
        -13,
        -30,
        13,
        -30
    );


    /* moving orb */

    const orbGlow =
        createGlow(
            challengeState.orbX,
            trackY,
            30,
            0xd9f6ff,
            0.16
        );


    const orb =
        challengeAdd(
            scene.add.circle(
                challengeState.orbX,
                trackY,
                11,
                0xf0fbff,
                1
            )
        );

    orb.setScrollFactor(0);
    orb.setDepth(107);


    challengeState.orb =
        orb;

    challengeState.orbGlow =
        orbGlow;

    challengeState.target =
        target;


    challengeUI.status.setText("HITS  0 / 7     MISSES  0 / 3");


    challengeState.update =
        function(delta) {

            if (
                !updateChallengeTimer(
                    delta,
                    28
                )
            ) {
                return;
            }


            const left =
                ui.playX -
                ui.playW / 2 +
                40;

            const right =
                ui.playX +
                ui.playW / 2 -
                40;


            orb.x +=
                challengeState.direction *
                challengeState.speed *
                delta /
                1000;


            if (
                orb.x >= right
            ) {

                orb.x = right;

                challengeState.direction =
                    -1;
            }


            if (
                orb.x <= left
            ) {

                orb.x = left;

                challengeState.direction =
                    1;
            }


            orbGlow.x =
                orb.x;

            orbGlow.y =
                orb.y;


            if (
                Phaser.Input.Keyboard.JustDown(
                    spaceKey
                ) || challengeState.rhythmPressed
            ) {

                challengeState.rhythmPressed = false;

                const distance =
                    Math.abs(
                        orb.x -
                        target.x
                    );


                if (
                    distance <= 58
                ) {

                    challengeState.hits++;

                    gameState.score += 15;

                    target.setFillStyle(
                        0xf0fbff,
                        0.42
                    );

                    scene.time.delayedCall(
                        120,
                        () => {

                            if (
                                target &&
                                target.active
                            ) {

                                target.setFillStyle(
                                    0xbcecff,
                                    0.18
                                );
                            }
                        }
                    );


                    target.x =
                        Phaser.Math.Between(
                            left + 70,
                            right - 70
                        );

                    lantern.x =
                        target.x;


                    challengeUI.status.setText(`HITS  ${challengeState.hits} / 7     MISSES  ${challengeState.misses} / 3`);


                    if (
                        challengeState.hits >=
                        challengeState.targetHits
                    ) {

                        completeChallenge(
                            "winter",
                            0
                        );

                        return;
                    }

                } else {

                    challengeState.misses++;

                    challengeUI.status.setText(`HITS  ${challengeState.hits} / 7     MISSES  ${challengeState.misses} / 3`);


                    if (
                        challengeState.misses >=
                        challengeState.maxMisses
                    ) {

                        failChallenge(
                            "The lantern rhythm was lost!"
                        );
                    }
                }
            }
        };
}


/* ============================================================
   WINTER GAME 2
   MOONLIGHT SEQUENCE
   ============================================================ */

function startMoonlightSequence() {

    const ui =
        createChallengeShell(
            "winter",
            "Moonlight Sequence",
            "Goal: complete 4 rounds in 48 seconds. Each completed round is worth 30 points; 3 mistakes end the challenge."
        );


    challengeState = {

        season: "winter",

        game: "sequence",

        timeLeft: 48,

        lives: 3,

        round: 1,

        sequence: [],

        inputIndex: 0,

        showing: true,

        pads: [],

        update: null
    };


    const padSize = 115;

    const gap = 35;


    const positions = [
        [
            ui.playX - padSize / 2 - gap / 2,
            ui.playY - padSize / 2 - gap / 2
        ],
        [
            ui.playX + padSize / 2 + gap / 2,
            ui.playY - padSize / 2 - gap / 2
        ],
        [
            ui.playX - padSize / 2 - gap / 2,
            ui.playY + padSize / 2 + gap / 2
        ],
        [
            ui.playX + padSize / 2 + gap / 2,
            ui.playY + padSize / 2 + gap / 2
        ]
    ];


    const padSymbols = [
        "1",
        "2",
        "3",
        "4"
    ];


    positions.forEach(
        (position, index) => {

            const pad =
                challengeAdd(
                    scene.add.rectangle(
                        position[0],
                        position[1],
                        padSize,
                        padSize,
                        0x557b92,
                        1
                    )
                );

            pad.setScrollFactor(0);
            pad.setDepth(105);

            pad.setStrokeStyle(
                4,
                0xbfe9f8,
                0.7
            );


            const symbol =
                challengeAdd(
                    scene.add.text(
                        position[0],
                        position[1],
                        padSymbols[index],
                        {
                            fontFamily: "Georgia",
                            fontSize: "34px",
                            fontStyle: "bold",
                            color: "#e7f8ff"
                        }
                    )
                );

            symbol.setOrigin(0.5);
            symbol.setScrollFactor(0);
            symbol.setDepth(106);


            pad.setInteractive({
                useHandCursor: true
            });


            pad.on(
                "pointerdown",
                () => {

                    if (
                        !challengeUI.started ||
                        challengeState.showing ||
                        challengeState.timeLeft <= 0
                    ) {
                        return;
                    }

                    handleSequenceInput(
                        index
                    );
                }
            );


            challengeState.pads.push({
                pad,
                symbol
            });
        }
    );


    challengeUI.status.setText("ROUND  1     HEARTS  3");


    function createSequence() {

        const length =
            Math.min(
                3 +
                challengeState.round,
                7
            );


        challengeState.sequence = [];

        for (
            let i = 0;
            i < length;
            i++
        ) {

            challengeState.sequence.push(
                Phaser.Math.Between(
                    0,
                    3
                )
            );
        }

        challengeState.inputIndex =
            0;

        showSequence();
    }


    function highlightPad(
        index
    ) {

        const item =
            challengeState.pads[index];

        if (!item) return;


        item.pad.setFillStyle(
            0xe3f8ff,
            1
        );

        item.symbol.setColor(
            "#244b5b"
        );


        const glow =
            createGlow(
                item.pad.x,
                item.pad.y,
                75,
                0xe2f8ff,
                0.12
            );


        challengeTimer({
            delay: 350,
            callback: () => {

                if (
                    item.pad &&
                    item.pad.active
                ) {

                    item.pad.setFillStyle(
                        0x557b92,
                        1
                    );
                }

                if (
                    item.symbol &&
                    item.symbol.active
                ) {

                    item.symbol.setColor(
                        "#e7f8ff"
                    );
                }

                if (
                    glow &&
                    glow.active
                ) {

                    glow.destroy();
                }
            }
        });
    }


    function showSequence() {

        challengeState.showing =
            true;

        challengeState.inputIndex =
            0;


        const sequence =
            challengeState.sequence;


        sequence.forEach(
            (index, i) => {

                challengeTimer({
                    delay:
                        550 +
                        i * 700,

                    callback: () => {

                        if (
                            gameState.mode !==
                            "challenge"
                        ) {
                            return;
                        }

                        highlightPad(
                            index
                        );
                    }
                });
            }
        );


        challengeTimer({
            delay:
                550 +
                sequence.length * 700,

            callback: () => {

                challengeState.showing =
                    false;

                challengeUI.status.setText(`ROUND  ${challengeState.round}     HEARTS  ${challengeState.lives}`);
            }
        });
    }


    function handleSequenceInput(
        index
    ) {

        const expected =
            challengeState.sequence[
                challengeState.inputIndex
            ];


        highlightPad(
            index
        );


        if (
            index !== expected
        ) {

            challengeState.lives--;

            challengeUI.status.setText(`ROUND  ${challengeState.round}     HEARTS  ${challengeState.lives}`);


            challengeState.showing =
                true;


            if (
                challengeState.lives <= 0
            ) {

                failChallenge(
                    "The moonlight sequence faded away!"
                );

                return;
            }


            challengeTimer({
                delay: 800,
                callback: () => {

                    createSequence();
                }
            });

            return;
        }


        challengeState.inputIndex++;


        if (
            challengeState.inputIndex >=
            challengeState.sequence.length
        ) {

            gameState.score +=
                30;


            challengeState.round++;


            if (
                challengeState.round > 4
            ) {

                completeChallenge(
                    "winter",
                    1
                );

                return;
            }


            challengeState.showing =
                true;


            challengeTimer({
                delay: 750,
                callback: () => {

                    createSequence();
                }
            });
        }
    }


    challengeState.onStart =
        createSequence;


    challengeState.update =
        function(delta) {

            updateChallengeTimer(
                delta,
                48
            );
        };
}


/* ============================================================
   FINAL SAFETY / RESIZE
   ============================================================ */

window.addEventListener(
    "resize",
    () => {

        /*
         * Phaser handles the canvas resize automatically.
         * Challenge screens are created using the current
         * canvas dimensions, so reopening a challenge after
         * resizing will use the new dimensions.
         */
    }
);

