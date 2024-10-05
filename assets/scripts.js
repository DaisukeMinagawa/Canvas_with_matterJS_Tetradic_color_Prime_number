        // Matter.js から必要な機能を取り出す。これらを使って物理世界を作る
        const { Engine, Render, Runner, Bodies, World, Body, Vector } = Matter;

        // 物理エンジンを作る。これが物理シミュレーションの中心になる
        const engine = Engine.create();
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

        // 地面を作る。画面の下端に置く
        const ground = Bodies.rectangle(window.innerWidth / 2, window.innerHeight, window.innerWidth, 60, { 
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

        // 作った地面と壁を物理世界に追加する
        World.add(engine.world, [ground, leftWall, rightWall]);

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
        function createBall(x, y) {
            const size = Math.random() * 15 + 10;  // 10から25の間でランダムなサイズを決める
            return Bodies.circle(x, y, size, {
                restitution: 0.8,  // はね返りの強さ。0.8はよく跳ねる
                friction: 0.005,  // 摩擦。小さいほど滑りやすい
                density: 0.001,  // 密度。小さいほど軽い
                render: { 
                    fillStyle: tetradColors[Math.floor(Math.random() * tetradColors.length)],  // ランダムに色を選ぶ
                    strokeStyle: 'transparent'  // 輪郭を透明にする
                }
            });
        }

        // ボールを入れておく配列
        let balls = [];
        // 最大のボールの数
        const maxBalls = 50;

        // ボールを発射する関数
        function shootBall() {
            const startX = Math.random() * (window.innerWidth - 100) + 50;  // 発射位置のX座標をランダムに決める
            const startY = Math.random() * (window.innerHeight / 3);  // 発射位置のY座標を画面の上1/3の範囲でランダムに決める

            const ball = createBall(startX, startY);  // ボールを作る
            World.add(engine.world, ball);  // 物理世界にボールを追加する
            balls.push(ball);  // 配列にボールを追加する

            // 発射する力の大きさを決める。発射位置のX座標が素数なら強め、そうでなければ弱めにする
            const forceMagnitude = isPrime(Math.floor(startX)) ? 0.03 : 0.02;
            const forceX = (Math.random() - 0.5) * forceMagnitude;  // X方向の力をランダムに決める
            const forceY = Math.random() * -forceMagnitude;  // Y方向の力を上向きにランダムに決める

            // ボールに力を加えて発射する
            Body.applyForce(ball, ball.position, { x: forceX, y: forceY });
        }

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

            // ボールの数が最大数より少なければ、新しいボールを発射する
            while (balls.length < maxBalls) {
                shootBall();
            }

            // 次のフレームでもこの関数を呼び出す
            requestAnimationFrame(gameLoop);
        }

        // ゲームループを開始する
        gameLoop();

        // ウィンドウのサイズが変わったときの処理
        window.addEventListener('resize', () => {
            // キャンバスのサイズを新しいウィンドウサイズに合わせる
            render.canvas.width = window.innerWidth;
            render.canvas.height = window.innerHeight;

            // いったん壁と地面を取り除く
            World.remove(engine.world, [ground, leftWall, rightWall]);

            // 地面の位置とサイズを新しいウィンドウサイズに合わせて調整する
            ground.position.x = window.innerWidth / 2;
            ground.position.y = window.innerHeight;
            ground.vertices[0].x = 0;
            ground.vertices[0].y = window.innerHeight;
            ground.vertices[1].x = window.innerWidth;
            ground.vertices[1].y = window.innerHeight;
            ground.vertices[2].x = window.innerWidth;
            ground.vertices[2].y = window.innerHeight + 60;
            ground.vertices[3].x = 0;
            ground.vertices[3].y = window.innerHeight + 60;

            // 左右の壁の位置を新しいウィンドウサイズに合わせて調整する
            leftWall.position.x = 0;
            leftWall.position.y = window.innerHeight / 2;
            rightWall.position.x = window.innerWidth;
            rightWall.position.y = window.innerHeight / 2;

            // 調整した壁と地面を物理世界に追加し直す
            World.add(engine.world, [ground, leftWall, rightWall]);
        });