// キャッシュをクリアする関数
async function clearCaches() {
    try {
        // 利用可能なすべてのキャッシュ名を取得
        const cacheNames = await caches.keys();
        
        // 各キャッシュを削除
        await Promise.allSettled(cacheNames.map(name => caches.delete(name)));
        
        // サービスワーカーが存在する場合は登録解除
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.allSettled(registrations.map(reg => reg.unregister()));
        }
        
        // ローカルストレージとセッションストレージをクリア
        localStorage.clear();
        sessionStorage.clear();
        
        // IndexedDBのデータベースを削除
        const databases = await indexedDB.databases();
        await Promise.allSettled(databases.map(db => indexedDB.deleteDatabase(db.name)));
        
        console.log('All caches and storages have been cleared.');
    } catch (error) {
        console.error('Error clearing caches:', error);
    }
}

// ページロード時にキャッシュをクリア
window.addEventListener('load', clearCaches);

// Matter.js から必要な機能を取り出す。これらを使って物理世界を作る
const { Engine, Render, Runner, Bodies, World, Body, Vector, Events } = Matter;

// 物理エンジンを作る。これが物理シミュレーションの中心になる
const engine = Engine.create();
// 重力を逆さまにする
engine.world.gravity.y = -1;

// 画面に描画するためのレンダラーを作る。これでシミュレーションが目に見えるようになる
const render = Render.create({
    element: document.body,  // body に描画する
    engine: engine,  // さっき作った物理エンジンを使う
    options: {
        width: window.innerWidth,  // 画面の幅いっぱいに
        height: window.innerHeight,  // 画面の高さいっぱいに
        wireframes: false,  // ワイヤーフレームは使わない。色付きの図形を描く
        background: '#f0f0f0'  // 背景色を薄いグレーにする
    }
});

// スコアを管理する変数
let score = 0;

// 天井（元の地面）を作る。画面の上端に置く
const ceiling = Bodies.rectangle(window.innerWidth / 2, 0, window.innerWidth, 60, { 
    isStatic: true,  // 動かないようにする
    render: { fillStyle: 'rgba(0,0,0,0)' }  // 透明にする
});

// 左の壁を作る
const leftWall = Bodies.rectangle(0, window.innerHeight / 2, 60, window.innerHeight, { 
    isStatic: true,  // 動かないようにする
    render: { fillStyle: 'rgba(0,0,0,0)' }  // 透明にする
});

// 右の壁を作る
const rightWall = Bodies.rectangle(window.innerWidth, window.innerHeight / 2, 60, window.innerHeight, { 
    isStatic: true,  // 動かないようにする
    render: { fillStyle: 'rgba(0,0,0,0)' }  // 透明にする
});

// 作った天井と壁を物理世界に追加する
World.add(engine.world, [ceiling, leftWall, rightWall]);

// 物理エンジンを動かすためのランナーを作る
const runner = Runner.create();
// ランナーを使ってエンジンを動かす。これで物理シミュレーションが始まる
Runner.run(runner, engine);

// レンダラーを動かして画面に描画を始める。これで動きが見えるようになる
Render.run(render);

// 素数かどうかを判定する関数。数学の基本だ
function isPrime(num) {
    if (num <= 1) return false;  // 1以下は素数じゃない
    for (let i = 2; i <= Math.sqrt(num); i++) {
        if (num % i === 0) return false;  // 割り切れる数があれば素数じゃない
    }
    return true;  // どの数でも割り切れなければ素数だ
}

// 4つの色（テトラドカラー）を生成する関数。これでカラフルな世界が作れる
function generateTetradColors() {
    const baseHue = Math.random() * 360;  // 基準となる色相をランダムに選ぶ
    return [
        `hsl(${baseHue}, 100%, 50%)`,  // 1つ目の色
        `hsl(${(baseHue + 90) % 360}, 100%, 50%)`,  // 2つ目の色（90度ずらす）
        `hsl(${(baseHue + 180) % 360}, 100%, 50%)`,  // 3つ目の色（180度ずらす）
        `hsl(${(baseHue + 270) % 360}, 100%, 50%)`  // 4つ目の色（270度ずらす）
    ];
}

// テトラドカラーを生成する
const tetradColors = generateTetradColors();

// ボールを作る関数
function createBall(x, y, isUserBall = false) {
    const size = Math.random() * 15 + 10;  // 10から25の間でランダムなサイズを決める
    const color = tetradColors[Math.floor(Math.random() * tetradColors.length)];  // ランダムに色を選ぶ
    return Bodies.circle(x, y, size, {
        restitution: 0.8,  // はね返りの強さ。0.8はよく跳ねる
        friction: 0.005,  // 摩擦。小さいほど滑りやすい
        density: 0.001,  // 密度。小さいほど軽い
        render: { 
            fillStyle: color,
            strokeStyle: 'transparent'  // 輪郭を透明にする
        },
        color: color,  // ボールの色を保存しておく
        isUserBall: isUserBall  // ユーザーが発射したボールかどうかを記録
    });
}

// ボールを入れておく配列
let balls = [];
// 最小のボールの数
const minBalls = 20;

// ボールを発射する関数（上向きに変更）
function shootBall(startX, startY, isUserBall = false) {
    const ball = createBall(startX, startY, isUserBall);  // ボールを作る
    World.add(engine.world, ball);  // 物理世界にボールを追加する
    balls.push(ball);  // 配列にボールを追加する

    // 発射する力の大きさを決める。発射位置のX座標が素数なら強め、そうでなければ弱めにする
    const forceMagnitude = isPrime(Math.floor(startX)) ? 0.03 : 0.02;
    const forceX = (Math.random() - 0.5) * forceMagnitude;  // X方向の力をランダムに決める
    const forceY = Math.random() * forceMagnitude;  // Y方向の力を上向きにランダムに決める

    // ボールに力を加えて発射する
    Body.applyForce(ball, ball.position, { x: forceX, y: forceY });
}

// 画面の上3分の1の領域にあるかどうかをチェックする関数
function isInTopThird(y) {
    return y < (window.innerHeight / 3);
}

// 衝突イベントを監視する
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        // 両方がボールで、同じ色で、かつ画面の上3分の1にある場合
        if (bodyA.color && bodyB.color && bodyA.color === bodyB.color &&
            isInTopThird(bodyA.position.y) && isInTopThird(bodyB.position.y)) {
            // 少なくとも一方がユーザーが発射したボールの場合のみスコアを増やす
            if (bodyA.isUserBall || bodyB.isUserBall) {
                score += 1;
            }
            // 両方のボールを消す
            World.remove(engine.world, [bodyA, bodyB]);
            balls = balls.filter(ball => ball !== bodyA && ball !== bodyB);
        }
    });
});

// ゲームのメインループ
function gameLoop() {
    // ボールの状態をチェックして、必要なら消す
    balls = balls.filter(ball => {
        // ボールがほとんど動いていない場合
        if (Math.abs(ball.velocity.x) < 0.1 && Math.abs(ball.velocity.y) < 0.1) {
            if (!ball.opacity) ball.opacity = 1;  // 透明度が設定されていなければ1（不透明）にする
            ball.opacity -= 0.02;  // 少しずつ透明にしていく
            ball.render.opacity = ball.opacity;  // 透明度を反映させる

            // 完全に透明になったらボールを消す
            if (ball.opacity <= 0) {
                World.remove(engine.world, ball);
                return false;  // 配列からも削除する
            }
        }
        return true;  // まだ消さないボールはそのまま残す
    });

    // ボールの数が最小数より少なければ、新しいボールを発射する
    while (balls.length < minBalls) {
        const startX = Math.random() * (window.innerWidth - 100) + 50;
        const startY = window.innerHeight * 2 / 3 + Math.random() * (window.innerHeight / 3);
        shootBall(startX, startY, false);  // ランダムに発射されたボールはisUserBall = false
    }

    // 次のフレームでもこの関数を呼び出す
    requestAnimationFrame(gameLoop);
}

// ゲームループを開始する
gameLoop();

// オーバーレイキャンバスを作成
const overlay = document.createElement('canvas');
overlay.style.position = 'absolute';
overlay.style.top = '0';
overlay.style.left = '0';
overlay.style.pointerEvents = 'none';
document.body.appendChild(overlay);

// オーバーレイコンテキストを取得
const overlayCtx = overlay.getContext('2d');

// 画面を分割する線を描画する関数（上部1/3に変更）
function drawDividers() {
    overlayCtx.strokeStyle = 'rgba(128, 128, 128, 0.1)'; // 薄いグレー (0.1の透明度)
    overlayCtx.lineWidth = 2;
    overlayCtx.beginPath();
    overlayCtx.moveTo(0, window.innerHeight / 3);
    overlayCtx.lineTo(window.innerWidth, window.innerHeight / 3);
    overlayCtx.stroke();
}

// スコアを描画する関数を更新（左下に変更）
function drawScore() {
    const fontSize = Math.min(40, window.innerWidth / 15); // 画面幅に応じてフォントサイズを調整
    overlayCtx.font = `${fontSize}px Arial`;
    overlayCtx.fillStyle = 'black';
    overlayCtx.textAlign = 'left';
    overlayCtx.textBaseline = 'bottom'; // テキストの下端を基準にする
    const padding = fontSize / 2; // パディングをフォントサイズの半分に設定
    overlayCtx.fillText(`SCORE: ${score}`, padding, window.innerHeight - padding);
}

// 星型のアニメーションを管理するためのクラス
class StarAnimation {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 0;
        this.opacity = 1;
        this.growing = true;
    }

    update() {
        if (this.growing) {
            this.size += 2;
            if (this.size >= 50) {
                this.growing = false;
            }
        } else {
            this.size -= 2;
            this.opacity -= 0.1;
        }
        return this.opacity > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(
                Math.cos((18 + i * 72) * Math.PI / 180) * this.size,
                -Math.sin((18 + i * 72) * Math.PI / 180) * this.size
            );
            ctx.lineTo(
                Math.cos((54 + i * 72) * Math.PI / 180) * (this.size / 2),
                -Math.sin((54 + i * 72) * Math.PI / 180) * (this.size / 2)
            );
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 255, 0, ${this.opacity})`;
        ctx.fill();
        ctx.restore();
    }

}

// 星型のアニメーションを格納する配列
let starAnimations = [];

// オーバーレイの更新関数を更新
function updateOverlay() {
    overlay.width = window.innerWidth;
    overlay.height = window.innerHeight;
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    drawDividers();
    drawScore();

    // 星型のアニメーションを更新して描画
    starAnimations = starAnimations.filter(star => {
        if (star.update()) {
            star.draw(overlayCtx);
            return true;
        }
        return false;
    });

    requestAnimationFrame(updateOverlay);
}

// ウィンドウのサイズが変わったときの処理
window.addEventListener('resize', () => {
    // キャンバスのサイズを新しいウィンドウサイズに合わせる
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;
    
    // レンダラーのバウンズも更新
    render.bounds.max.x = window.innerWidth;
    render.bounds.max.y = window.innerHeight;

    // オーバーレイキャンバスのサイズも更新
    overlay.width = window.innerWidth;
    overlay.height = window.innerHeight;

    // いったん天井と壁を取り除く
    World.remove(engine.world, [ceiling, leftWall, rightWall]);

    // 天井の位置とサイズを新しいウィンドウサイズに合わせて調整する
    ceiling.position.x = window.innerWidth / 2;
    ceiling.position.y = 0;
    ceiling.vertices[0].x = 0;
    ceiling.vertices[0].y = -60;
    ceiling.vertices[1].x = window.innerWidth;
    ceiling.vertices[1].y = -60;
    ceiling.vertices[2].x = window.innerWidth;
    ceiling.vertices[2].y = 0;
    ceiling.vertices[3].x = 0;
    ceiling.vertices[3].y = 0;

    // 左右の壁の位置を新しいウィンドウサイズに合わせて調整する
    leftWall.position.x = 0;
    leftWall.position.y = window.innerHeight / 2;
    rightWall.position.x = window.innerWidth;
    rightWall.position.y = window.innerHeight / 2;

    // 調整した天井と壁を物理世界に追加し直す
    World.add(engine.world, [ceiling, leftWall, rightWall]);
});

// クリックやタッチイベントに対応する関数を更新
function handleInteraction(event) {
    // クリックまたはタッチ位置を取得
    const x = event.clientX || event.touches[0].clientX;
    const y = event.clientY || event.touches[0].clientY;

    // 星型のアニメーションを追加
    starAnimations.push(new StarAnimation(x, y));

    // クリック位置からボールを発射
    shootBall(x, y, true);  // ユーザーが発射したボールはisUserBall = true
}

// マウスクリックイベントリスナーを追加
render.canvas.addEventListener('click', handleInteraction);

// タッチイベントリスナーを追加（モバイルデバイス用）
render.canvas.addEventListener('touchstart', handleInteraction);

// オーバーレイの更新を開始
updateOverlay();