worldWidth = 800;
worldHeight = 600;
halfWorldWidth = worldWidth/2;

inGameDevConfig = {
    starRepeatCount: 0,
    remainingTime: 20
}

inGameProdConfig = {
    starRepeatCount: 9,
    remainingTime: 150
}

inGameConfig = process.env.NODE_ENV == 'development' ? inGameDevConfig : inGameProdConfig;

var config = {
    type: Phaser.AUTO,
    width: worldWidth,
    height: worldHeight,

    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },

    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);


function preload () {
    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/grass-platform.png');
    this.load.image('star', 'assets/star.png');
    this.load.image('health', 'assets/health.png');
    this.load.image('bomb', 'assets/bomb.png');
    this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
    this.load.image('restart', 'assets/restart.png');
    this.load.image('cloud', 'assets/cloud.png');
    this.load.image('apple', 'assets/apple.png');

    // audio preload
    this.load.audio('collect-star', 'assets/collect-star.mp3')
    this.load.audio('explode', 'assets/explosion.mp3')
    this.load.audio('game-over', 'assets/game-over.mp3')
    this.load.audio('game-music', 'assets/in-game-music.mp3')

}


function create () {
    this.add.image(400, 300, 'sky');
    //clouds
    this.add.image(700, 60, 'cloud').setScale(0.8);
    this.add.image(350, 36, 'cloud').setScale(0.8);


    createPlatforms(this);
    createStarDust(this);
    createPlayer(this);
    createPlayerAnims(this);
    createGameOverAndRestartObj(this);
    scoreAndPlayerHealth(this);
    addSounds(this);

    restartButton.on('pointerdown', () => {
      this.scene.restart();
    });


    // this.time.delayedCall(2000, () => { // After 2 seconds
    //     player.setSize(80,80);
    //     player.setDisplaySize(100, 100);
    // });



    //define a collider object to check for collisions between player and all platforms in the platforms static group and invoke a callback
    playerPlatformCollider = this.physics.add.collider(player, platforms)
    //define a collider object to check for collisions between star group and all platforms in the platforms static group and invoke a callback
    this.physics.add.collider(stars, platforms)

    //now create an object to monitor and check if there is an overlap between player and any child in the stars group. If there is an overlap then call the function collectStar
    this.physics.add.overlap(player, stars, collectStar, null, this);


    //creare a bombs group and add colliders between bombs and platforms, and bombs and players
    bombs = this.physics.add.group();

    //creare an apples group and add colliders between apples and platforms

    apples = this.physics.add.group();
    //now create an object to monitor and check if there is an overlap between player and any child in the apples group. If there is an overlap then call the function collectApple
    this.physics.add.overlap(player, apples, collectApple, null, this);




    // colliders
    this.physics.add.collider(bombs, bombs);

    this.physics.add.collider(bombs, platforms);

    this.physics.add.collider(apples, platforms);

    this.physics.add.collider(player, bombs, hitBomb, null, this);


    //Start Game Timer
    startGameTimer(this)
    // Play Game music
    gameMusic.play()

}

function addSounds(parent){
    collectStarSound = parent.sound.add('collect-star', {volume: 0.8})
    explosionSound = parent.sound.add('explode', {volume: 1.0})
    gameOverSound = parent.sound.add('game-over', {volume: 1.0})
    gameMusic = parent.sound.add('game-music', {volume: 0.35, loop:true})
}

function startGameTimer(parent) {

    remainingTime = inGameConfig.remainingTime;

    timerText = parent.add.text(400, 10, 'TIME ' + remainingTime + ' sec', { fontSize: '16px', fill: '#fff', fontStyle: "bold" });

    timerEvent = parent.time.addEvent({
        delay: 1000, // Execute every second
        callback: updateTimer,
        callbackScope: parent,
        loop: true
    });
}

function updateTimer() {
    remainingTime -= 1
    timerText.setText('TIME ' + remainingTime + ' sec')
    if (remainingTime <=0 || this.gameOver) {
        timerEvent.remove(false) // remove the timer event
        // handle gamve over logic
        setGameOver(this)
    }
}

function scoreAndPlayerHealth(parent) {

    // star icon
    parent.add.image(120, 20,  'star').setScale(0.6);

    //score configurations
    score = 0

    scoreTextPositionX = 131
    scoreTextPositionY = 10
    scoreText = parent.add.text(scoreTextPositionX, scoreTextPositionY, 'x0', { fontSize: '18px', fill: '#fff', fontStyle: "bold" });

    
    //Player health
    
    //health icon
    parent.add.image(586, 20, 'health').setScale(0.9);

    //health score
    playerHealthScore = 100
    playerHealthTextPosX = 600
    playerHealthTextPosY = 10
    playerHealthText = parent.add.text(playerHealthTextPosX, playerHealthTextPosY, playerHealthScore, {fontSize: "18px", fill:"#11ff11", fontStyle: "bold"});

}

function createGameOverAndRestartObj(parent) {

    parent.gameOver = false
    gameOverTextPosX = 280
    gameOverTextPosY = 100
    gameOverText = parent.add.text(gameOverTextPosX, gameOverTextPosY, 'Game Over', { fontSize: '40px', fill: '#ff0000' });
    gameOverText.visible = false;

    restartButton = parent.add.sprite(400, 300, 'restart');
    restartButton.setInteractive();
    restartButton.visible = false;
    return restartButton;
}

function createApple(parent) {

    //at any time no more than 2 apples should be available for the player and each apple should be availble for 10 secs
    if (apples.countActive(true) < 2) {
        // create an apple on the opposite half of the world where the player is to make it difficult
        var appleX = (player.x < halfWorldWidth) ? Phaser.Math.Between(halfWorldWidth, worldWidth) : Phaser.Math.Between(0, halfWorldWidth);
        
        let apple = apples.create(appleX, 16, 'apple');

        apple.setBounce(1)
        apple.setCollideWorldBounds(true)
        apple.setVelocity(Phaser.Math.Between(-150, 150), 20);

        parent.time.delayedCall(10000, ()=>{
            apple.destroy();
            apples.remove(apple);
        }, [], parent);
    }
}

function hitBomb(player, bomb) {

    if (this.gameOver){
        return
    };

    playerHealthScore -= 10
    playerHealthText.setText(playerHealthScore)

    if (playerHealthScore > 0) {
        playerHealthScore <= 60 ? (player.setTint(0xef9700), playerHealthText.setColor('#ef9700'), createApple(this)) : player.setTint(0xffffff);

    } else {

        // if playerHealthScore is <=0 then game is over
        setGameOver(this)

    }

}

function setGameOver(parent) {
    
    if (parent.gameOver) { // like acquiring lock to ensure single execution of setGameOver
        return;
    }
    parent.gameOver = true;

    player.setTint(0xff0000); // set player color to red
    
    // make player jump up with a certain velocity and land 
    player.setVelocityY(-10);
    player.body.setGravityY(200); // reduce player gravity to slowdown player fall


    //stop the in game music
    gameMusic.stop()

    // play explosion sound and remove it after play is complete
    explosionSound.play()
    explosionSound.on('complete', () => {
        parent.sound.remove(explosionSound); // Remove the sound object
    });

    player.anims.play('turn');

    // player.setCollideWorldBounds(false);

    parent.physics.world.removeCollider(playerPlatformCollider);


    parent.time.delayedCall(2000, () => { // After 2 seconds
        gameOverSound.play()
        parent.physics.pause();
        gameOverText.visible = true;
        restartButton.visible = true;
    });
}


function collectStar(player, star) {
    // disable the physcis body of the star and hide it
    // star has its physics body disabled and its parent Game Object is made inactive and invisible, which removes it from display
    star.disableBody(true, true);

    if (this.gameOver) return;

    // play star collect sound
    collectStarSound.play()

    //Now update the score and the scoreText
    score += 1;
    scoreText.setText('x'+score)

    
    /*        
        Check if all stars are collected and if yes 
        then 
        1. create the stars again
        2. create the bomb everytime stars are all collected
    */
    if (stars.countActive(true) === 0) {
        // enable stars
        bringBackRandomNumOfStars(stars)

        // create a bomb on the opposite half of the world where the player is
        var bombX = (player.x < halfWorldWidth) ? Phaser.Math.Between(halfWorldWidth, worldWidth) : Phaser.Math.Between(0, halfWorldWidth);
        
        let bomb = bombs.create(bombX, 16, 'bomb');

        bomb.setBounce(1)
        bomb.setCollideWorldBounds(true)
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
    }
}

function bringBackRandomNumOfStars(stars) {
    stars.children.iterate((child)=>{
        if (Math.random() < 0.48) { // just to not enable all stars
            child.enableBody(true, child.x, 0, true, true);
        }
    });
}

function collectApple(player, apple) {
    apple.disableBody(true, true)
    if (this.gameOver) return;
    playerHealthScore += 10
    playerHealthText.setText(playerHealthScore)
    playerHealthScore > 60 ? (player.setTint(0xffffff), playerHealthText.setColor('#00ff00')) : null;
    apple.destroy();
    apples.remove(apple);
}

function createPlatforms(parent) {
    platforms = parent.physics.add.staticGroup(); //static physics objects 

    // platforms.create(400, 568, 'ground')
    // .setScale(4.71, 0.5) //scale the game image object to twice to cover the full x span
    // .refreshBody() //inform physics to consider the new changes (i.e. scaled image) to the platform object

    const imageWidth = 400;
    const repeatCount = 4.71;
    const tileSpriteWidth = imageWidth * repeatCount;

    // Create a TileSprite that is 4.71 times the width of the image
    ground = parent.add.tileSprite(0, 560, tileSpriteWidth, 32, 'ground')
        .setOrigin(0, 0);

    platforms.add(ground);
    // ground.body.setImmovable(true); -> Not needed

    platforms.create(600, 400, 'ground')

    platforms.create(50, 250, 'ground');

    platforms.create(750, 220, 'ground');

}

function createPlayer(parent) {
    player = parent.physics.add.sprite(100, 450, 'dude');
    
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);

    /*
        In the below line:
            1. "body" holds the reference to the physcis-arcade-body of the physics sprite object (player) created above, we can control the physics aspects of the game object using this.
            2. We set the gravity in Y direction to 300. The larger the number the heavier the object and faster it will experience gravity in the Y direction
    */

    player.body.setGravityY(300); // but this will lead the body all the way down until it collides with the world bounds, so we need to define a constraint for the player to collide with the ground game object

    //the collider is a static game object. Had it been a defult dynamic game object the player would have naturally by default collided with the platform and all platforms (since they are a group) would have fallen
    // we need to define a collider object that monitors if the two given objects/groups collide with each other or not and if they collide then it invokes a callback function

}

function createPlayerAnims(parent) {
    parent.anims.create({
        key: 'left',
        frames: parent.anims.generateFrameNumbers('dude', { start: 0, end: 3}),
        frameRate: 15,
        repeat: -1, //keep looping
    });

    parent.anims.create({
        key: 'turn',
        frames: [ { key: 'dude', frame: 4 } ],
        frameRate: 15,
    });

    parent.anims.create({
        key: 'right',
        frames: parent.anims.generateFrameNumbers('dude', { start: 5, end: 8}),
        frameRate: 15,
        repeat: -1, //keep looping
    });

}

function createStarDust(parent) {
    stars = parent.physics.add.group({
        key: 'star', //give all child objects in the group the star texture
        repeat: inGameConfig.starRepeatCount,
        setXY: {
            x:12, y:0, stepX:70
        }
    });

    stars.children.iterate((child)=>{
        child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8))
    });
}

/*
    * For game controls we need to listen to inputs. Say from the keyboard
    * Phaser has a built-in Keyboard manager
*/
function update() {

    if (this.gameOver) {
      return; // Don't update if game is over
    }


    cursors = this.input.keyboard.createCursorKeys(); // This populates the cursors object with four properties: up, down, left, right, that are all instances of Key objects.

    if (cursors.left.isDown) {
        
        player.setVelocityX(-160);

        player.anims.play('left', true);

    } else if (cursors.right.isDown) {
        
        player.setVelocityX(160);

        player.anims.play('right', true);
    
    } else {
    
        player.setVelocityX(0);

        player.anims.play('turn');
    
    }

    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-660);
    }

    if (stars.countActive(true) === 0) {
        bringBackRandomNumOfStars(stars)
    }
}