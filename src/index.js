worldWidth = 800;
worldHeight = 600;
halfWorldWidth = worldWidth/2;

inGameDevConfig = {
    starRepeatCount: 3,
    remainingTime: 60,
    totalPotions: 2,
    immuneTime: 12,
    winStarCount: 20
}

inGameProdConfig = {
    starRepeatCount: 9,
    remainingTime: 240,
    totalPotions: 4,
    immuneTime: 10,
    winStarCount: 50
}

inGameConfig = process.env.NODE_ENV == 'development' ? inGameDevConfig : inGameProdConfig;

var config = {
    type: Phaser.AUTO,
    width: worldWidth,
    height: worldHeight,
    parent: "game-container",

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
    this.load.image('sky', 'assets/images/sky.png');
    this.load.image('ground', 'assets/images/grass-platform.png');
    this.load.image('star', 'assets/images/star.png');
    this.load.image('health', 'assets/images/health.png');
    this.load.image('bomb', 'assets/images/bomb.png');
    this.load.spritesheet('dude', 'assets/images/dude.png', { frameWidth: 32, frameHeight: 48 });
    this.load.spritesheet('mario', 'assets/images/mario.png', { frameWidth: 42, frameHeight: 23 });
    this.load.image('restart', 'assets/images/restart.png');
    this.load.image('cloud', 'assets/images/cloud.png');
    this.load.image('apple', 'assets/images/apple.png');
    this.load.image('reset', 'assets/images/reset.png');
    this.load.image('potion', 'assets/images/potion.png');
    this.load.image('warp-pipe', 'assets/images/warp-pipe.png');
    this.load.image('hourglass', 'assets/images/hourglass.png');

    // audio preload
    this.load.audio('collect-star', 'assets/sounds/collect-star.mp3')
    this.load.audio('explode', 'assets/sounds/explosion.mp3')
    this.load.audio('game-over', 'assets/sounds/game-over.mp3')
    this.load.audio('game-music', 'assets/sounds/in-game-music.mp3')
    this.load.audio('power-up', 'assets/sounds/power-up.mp3')
    this.load.audio('punch', 'assets/sounds/punch.mp3')
    this.load.audio('jump', 'assets/sounds/jump.mp3')
    this.load.audio('drink-potion', 'assets/sounds/drink-potion.mp3')
    this.load.audio('capture-bomb', 'assets/sounds/bombCapture.mp3')
    this.load.audio('level-complete', 'assets/sounds/level-complete.mp3')
    this.load.audio('enter-pipe', 'assets/sounds/enter-pipe.mp3')

}


function create () {

    this.gameStarted = false
    this.levelCompleted = false
    this.totalPotionsReleased = 0
    this.isPlayerImmune = false
    iscreatePotion = false
    playerImmuneTime = 0
    isPlayerOnPipe = false
    this.potionReleaseTime = Phaser.Math.Between(inGameConfig.remainingTime/3, inGameConfig.remainingTime/1.5)

    walkingLeft = false
    walkingRight = false

    // this.add.image(400, 300, 'sky');
    sky = this.add.tileSprite(400, 300, this.game.config.width, this.game.config.height, 'sky');
    sky.setAlpha(1)


    createPlatforms(this);
    createStarDust(this);
    createPlayer(this);
    createPlayerAnims(this);
    player.anims.play('stand-facing-right', true)
    createGameOverAndRestartObj(this);
    scoreAndPlayerHealth(this);
    addSounds(this);

    resetButton.on('pointerdown', () => {
        this.scene.restart();
    });

    startButton.on('pointerdown', ()=>{
        startGame(this)
    })



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


    //potion group
    potions = this.physics.add.group();
    //set overlap between player and potion
    this.physics.add.overlap(player, potions, collectPotion, null, this);
    //set colliders between potion and platforms
    this.physics.add.collider(potions, platforms);

    //define the warp pipe sprite and disable its display and physics body 
    pipeHeight = 39;
    groundTopY = 560;
    // Start with pipe below ground (offscreen)
    warpPipe = this.physics.add.staticSprite(400, groundTopY + pipeHeight / 2, 'warp-pipe');
    setActiveState(warpPipe, false)
    this.physics.add.collider(player, warpPipe);
    // overlap
    // enter pipe
    pipeSensor = this.physics.add.sprite(400, groundTopY + pipeHeight / 2 - 60, null)
      .setSize(32, 3)
      .setVisible(false)
      .setImmovable(true);
    pipeSensor.body.setAllowGravity(false)

    enteringPipe = false
    this.physics.add.overlap(player, pipeSensor, () => {
      if (cursors.down.isDown && !enteringPipe) {
        enteringPipe = true;
        enterPipe();
      }
    }, null, this);

    enterPipe = () => {
        warpPipe.body.updateFromGameObject();
        enterPipeSound.play()


        this.physics.world.disable(player); // prevent collisions during animation

        this.tweens.add({
            targets: player,
            x: pipeSensor.x,
            y: player.y + 32, // move into pipe (adjust as needed)
            duration: 1000,
            ease: 'Sine.easeIn',
            onComplete: () => {
              player.setVisible(false);
              this.timerEvent.remove(false);
              levelComplText.visible=true;
              resetButton.visible=true;
            }
        });
    }


    // colliders
    this.physics.add.collider(bombs, bombs);

    this.physics.add.collider(bombs, platforms);

    this.physics.add.collider(apples, platforms);

    playerBombCollider = this.physics.add.collider(player, bombs, hitBomb, null, this);


}

function setActiveState(spriteObj, stateBool) {
  spriteObj.setVisible(stateBool);
  spriteObj.body.enable = stateBool;
}



function addSounds(parent){
    collectStarSound = parent.sound.add('collect-star', {volume: 0.7})
    explosionSound = parent.sound.add('explode', {volume: 0.65})
    gameOverSound = parent.sound.add('game-over', {volume: 0.75})
    gameMusic = parent.sound.add('game-music', {volume: 0.35, loop:true})
    powerUpSound = parent.sound.add('power-up', {volume:0.8})
    punchSound = parent.sound.add('punch', {volume:0.50})
    drinkPotionSound = parent.sound.add('drink-potion', {volume:0.7})
    jumpSound = parent.sound.add('jump', {volume:0.8})
    captureBombSound = parent.sound.add('capture-bomb', {volume:0.8})
    levelCompleteSound = parent.sound.add('level-complete', {volume:0.75})
    enterPipeSound = parent.sound.add('enter-pipe', {volume:0.75})
}

function startGame(parent) {
    palyAgainText.visible = false;
    startButton.visible = false;
    parent.gameStarted = true;
    // Play Game music
    gameMusic.play()
    //Start Game Timer
    startGameTimer(parent)
}

function startGameTimer(parent) {

    remainingTime = inGameConfig.remainingTime;

    parent.add.image(385, 20,  'hourglass').setScale(0.85);

    timerText = parent.add.text(400, 12, remainingTime + ' sec', { fontSize: '16px', fill: '#fff', fontStyle: "bold" });

    parent.timerEvent = parent.time.addEvent({
        delay: 1000, // Execute every second
        callback: updateGameByTime,
        callbackScope: parent,
        loop: true
    });
}

function updateGameByTime() {
    remainingTime -= 1
    timerText.setText(remainingTime + ' sec')
    if (remainingTime <=0 || this.gameOver) {
        this.timerEvent.remove(false) // remove the timer event
        // handle gamve over logic
        setGameOver(this)
    }

    // release potion if the following conditions are met
    if (remainingTime == this.potionReleaseTime) {
        iscreatePotion = true
    }
    if (bombs.countActive(true) >=5 && iscreatePotion) {
        // release potion
        createPotion(this)
        iscreatePotion = false
    }

    //bring back stars randomly
    if (Math.random() < 0.80) {
        bringBackRandomNumOfStars(stars, score)
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
    parent.add.image(586, 20, 'health').setScale(0.9).setAlpha(0.75);

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

    levelComplPosX = 240
    levelComplPosY = 100
    levelComplText = parent.add.text(levelComplPosX, levelComplPosY, 'Congratulations!', { fontSize: '40px', fill: '#00ff00' });
    levelComplText.visible = false;

    playAgainPosX = 240
    playAgainPosY = 200
    palyAgainText = parent.add.text(playAgainPosX, playAgainPosY, 'Click START To Play', { fontSize: '25px', fill: '#fff', fontStyle:"bold" });
    // palyAgainText.visible = false;

    resetButton = parent.add.sprite(400, 300, 'reset');
    resetButton.setInteractive();
    resetButton.setAlpha(0.85)
    resetButton.visible = false;

    startButton = parent.add.sprite(400, 300, 'restart');
    startButton.setInteractive();
    // startButton.visible = false;
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

function createPotion(parent){
    // create one potion as per below conditions 
    if (potions.countActive(true) === 0 && parent.totalPotionsReleased < inGameConfig.totalPotions) {
        // potion should drop on the opposite side of the player
        let potionVelocityVector = -1;
        parent.totalPotionsReleased += 1
        var potionX = (player.x < halfWorldWidth) ? Phaser.Math.Between(halfWorldWidth, worldWidth) : (Phaser.Math.Between(0, halfWorldWidth), potionVelocityVector = 1);
        var potionY = 16;

        let potion = potions.create(potionX, potionY, 'potion');

        potion.setBounce(0.1);
        potion.setVelocityX(10*potionVelocityVector)
        potion.setCollideWorldBounds(false)
    }
}

function hitBomb(player, bomb) {

    if (this.gameOver || !this.gameStarted){
        return
    }

    //if player is immune then dont consider the hit
    if (this.isPlayerImmune) {

        //play the bom collect sound
        captureBombSound.play()

        // also remove the collected bombs
        bomb.disableBody(true,true)
        bomb.destroy()
        bombs.remove(bomb)

        //implement later: increase score count

        return
    }

    punchSound.play()
    playerHealthScore -= 10
    playerHealthText.setText(playerHealthScore)
    // console.log("playerHealthScore:", playerHealthScore)

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

    player.setDepth(2)
    player.setTint(0xbb0a1e); // set player color to red
    
    // make player jump up with a certain velocity and land 
    player.setVelocityY(-200);
    player.body.setGravityY(200); // reduce player gravity to slowdown player fall


    //stop the in game music and levelCompl music
    gameMusic.stop()
    levelCompleteSound.stop()

    // play explosion sound and remove it after play is complete
    explosionSound.play()
    explosionSound.on('complete', () => {
        parent.sound.remove(explosionSound); // Remove the sound object
    });

    player.anims.play('stand-facing-right');

    // player.setCollideWorldBounds(false);

    // remove player's collider objecs with platform and bombs
    parent.physics.world.removeCollider(playerBombCollider);
    parent.physics.world.removeCollider(playerPlatformCollider);



    parent.time.delayedCall(2000, () => { // After 2 seconds
        gameOverSound.play()
        parent.physics.pause();
        gameOverText.visible = true;
        resetButton.visible = true;
    });
}

function collectStar(player, star) {
    // disable the physcis body of the star and hide it
    // star has its physics body disabled and its parent Game Object is made inactive and invisible, which removes it from display
    star.disableBody(true, true);

    if (this.gameOver || this.levelCompleted) return;

    // play star collect sound
    collectStarSound.play()

    //Now update the score and the scoreText
    score += 1;
    scoreText.setText('x'+score)

    //check if player collected the required stars to win
    if (score >= inGameConfig.winStarCount) {

        //stop in game music and play level complete sound
        gameMusic.stop()
        levelCompleteSound.play()

        //set levelCOmpleted to true
        this.levelCompleted = true
        
        // Remove all bombs
        // First `true`: remove from scene (destroy children)
        // Second `true`: also destroy them
        bombs.clear(true, true);


        // Enable the warp pipe
        setActiveState(warpPipe, true);
        // add collider between player and pipe
        this.physics.add.collider(player, warpPipe)
        // raise the  pipe
        this.tweens.add({
            targets: warpPipe,
            y: groundTopY - pipeHeight / 2,
            duration: 2000,
            ease: 'Sine.easeOut',
            onComplete: () => {
              warpPipe.body.updateFromGameObject();
            }
        });
        
        return;
    }

    
    /*        
        Check if all stars are collected and if yes 
        then 
        1. create the stars again
        2. create the bomb everytime stars are all collected
    */
    if ((stars.countActive(true) === 0) && !this.levelCompleted) {
        // enable stars
        bringBackRandomNumOfStars(stars, score)

        // create a bomb on the opposite half of the world where the player is
        var bombX = (player.x < halfWorldWidth) ? Phaser.Math.Between(halfWorldWidth, worldWidth) : Phaser.Math.Between(0, halfWorldWidth);
        
        let bomb = bombs.create(bombX, 16, 'bomb');

        bomb.setBounce(1)
        bomb.setCollideWorldBounds(true)
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
    }
}

function bringBackRandomNumOfStars(stars, score) {
    if (score >= inGameConfig.winStarCount || (stars.countActive(true) != 0)) {return;}

    stars.children.iterate((child)=>{
        if (Math.random() < 0.48) { // just to not enable all stars
            newChildPosX = Phaser.Math.Between(12, worldWidth-30)
            child.enableBody(true, newChildPosX, 0, true, true);
        }
    });
}

function collectApple(player, apple) {
    apple.disableBody(true, true)
    if (this.gameOver) return;
    powerUpSound.play()
    playerHealthScore += 10
    playerHealthText.setText(playerHealthScore)
    playerHealthScore > 60 ? (player.setTint(0xffffff), playerHealthText.setColor('#00ff00')) : null;
    apple.destroy();
    apples.remove(apple);
}

function collectPotion(player, potion) {
    potion.disableBody(true, true)
    potion.destroy()
    potions.remove(potion)
    if (this.gameOver || !this.gameStarted) {return;}
    
    drinkPotionSound.play()
    playerHealthScore += 50 //increase health by 50
    playerHealthText.setText(playerHealthScore)
    playerHealthScore > 60 ? (player.setTint(0xffffff), playerHealthText.setColor('#00ff00')) : null;

    /*
        Main:
        1. Keep the player immune against bombs for configuration count of seconds
        To achieve this set player immunity to true and reset to false after the said duration
    */

    this.isPlayerImmune = true
    playerImmuneTime = inGameConfig.immuneTime
    //change game music playback speed to indicte to user that he is immune
    gameMusic.setRate(1.25)
    this.time.delayedCall(playerImmuneTime*1000, ()=>{
        this.isPlayerImmune = false
        gameMusic.setRate(1)
    }, [], this)

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
        .setOrigin(0, 0)
        .setDepth(1);

    platforms.add(ground);
    // ground.body.setImmovable(true); -> Not needed

    platforms.create(600, 400, 'ground')

    platforms.create(50, 250, 'ground');

    platforms.create(750, 220, 'ground');

}

function createPlayer(parent) {
    player = parent.physics.add.sprite(100, 550, 'mario');
    // player.setScale(2,2)
    
    // player.setBounce(0.2);
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
        key: 'right',
        frames: parent.anims.generateFrameNumbers('mario', { start: 5, end: 8}),
        frameRate: 9,
        repeat: -1, //keep looping
    });

    parent.anims.create({
        key: 'stand-facing-right',
        frames: [ { key: 'mario', frame: 4 } ],
        frameRate: 12,
    });

    parent.anims.create({
        key: 'stand-facing-left',
        frames: [ { key: 'mario', frame: 3 } ],
        frameRate: 12,
    });

    parent.anims.create({
        key: 'left',
        frames: parent.anims.generateFrameNumbers('mario', { start: 0, end: 3}),
        frameRate: 9,
        repeat: -1, //keep looping
    });

}

function createStarDust(parent) {

    stars = parent.physics.add.group({
        key: 'star', //give all child objects in the group the star texture
        repeat: inGameConfig.starRepeatCount,
        setXY: {
            x:Phaser.Math.Between(12,parent.game.config.width-100), y:0, stepX:Phaser.Math.Between(30,70)
        }
    });

    stars.children.iterate((child)=>{
        child.setScale(0.8)
        child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8))
    });
}

/*
    * For game controls we need to listen to inputs. Say from the keyboard
    * Phaser has a built-in Keyboard manager
*/
function update() {

    if (this.gameOver || !this.gameStarted) {
      return; // Don't update if game is over
    }

    // keep background sky moving
    sky.tilePositionX -= 0.10;

    cursors = this.input.keyboard.createCursorKeys(); // This populates the cursors object with four properties: up, down, left, right, that are all instances of Key objects.

    if (cursors.left.isDown) {

        walkingLeft = true
        walkingRight = false
        
        player.setVelocityX(-80);

        player.anims.play('left', true);

    } else if (cursors.right.isDown) {

        walkingLeft = false
        walkingRight = true
        
        player.setVelocityX(80);

        player.anims.play('right', true);
    
    } 
    else {
    
        player.setVelocityX(0);

        if (walkingLeft) {
            player.anims.play('stand-facing-left', true)
        }

        if (walkingRight) {
            player.anims.play('stand-facing-right', true)
        }

        if (!(walkingLeft || walkingRight)) {
             player.anims.play('stand-facing-right', true)
        }
    
    }

    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-660);
        jumpSound.play();
    }
}