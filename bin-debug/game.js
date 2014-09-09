window.onload = function(){
	"use strict";

	var win = window;
	var document = win.document;
	var body = document.body;
	var Math = win.Math;

	var PI = Math.PI;
	var sqrt = Math.sqrt;
	var rand = Math.random;

	var toChar = String.fromCharCode;

	var YES = true;
	var NO = false;

	//------------------------------------------------------------------------------------------------------------------
	// sizes and DOM
	//------------------------------------------------------------------------------------------------------------------

	var TABLE_WIDTH = 700;
	var TABLE_HEIGHT = 220;
	var CORNER_RADIUS = 200;
	var BUMPER_ZONE_RADIUS = CORNER_RADIUS + TABLE_WIDTH/2;
	BUMPER_ZONE_RADIUS = pyth(BUMPER_ZONE_RADIUS,BUMPER_ZONE_RADIUS) - CORNER_RADIUS >> 0;
	var RING_ZONE_RADIUS = (TABLE_WIDTH/2+pyth(TABLE_WIDTH/2,TABLE_WIDTH/2))/2; //some arbitrary radius
	var TOTAL_SIZE = TABLE_WIDTH + 2*TABLE_HEIGHT + 2*CORNER_RADIUS;
	var HALF_SIZE = TOTAL_SIZE/2;
	var TILE_SIZE = 20;

	var STATUS_HEIGHT = 50;

	var screenWidth;
	var screenHeight;
	var screenMinSize;

	var MONSTER_SPRITE_MARGIN = 4;
	var MONSTER_SPRITE_SIZE = 40;

	var bgCanvas = makeCanvas(TOTAL_SIZE, TOTAL_SIZE);
	var bgCtx = getContext(bgCanvas);

	var renderCanvas = makeCanvas();
	var renderCtx = getContext(renderCanvas);

	var fxCanvas = makeCanvas();
	var fxCtx = getContext(fxCanvas);

	var entityCanvas = makeCanvas();
	var entityCtx = getContext(entityCanvas);

	var statusCanvas = makeCanvas();
	var statusCtx = getContext(statusCanvas);

	var monsterCanvas = makeCanvas(4*(MONSTER_SPRITE_SIZE+2*MONSTER_SPRITE_MARGIN),MONSTER_SPRITE_SIZE+2*MONSTER_SPRITE_MARGIN);
	var monsterCtx = getContext(monsterCanvas);

	var cameraX;
	var cameraY;
	var prevCameraX;
	var prevCameraY;

	window.onresize = function(){
		screenWidth = clamp(win.innerWidth,TABLE_WIDTH,TOTAL_SIZE);
		screenHeight = clamp(win.innerHeight-STATUS_HEIGHT,TABLE_WIDTH,TOTAL_SIZE);
		screenMinSize = Math.min(screenWidth,screenHeight);
		statusCanvas.width = entityCanvas.width = fxCanvas.width = renderCanvas.width = screenWidth = screenWidth-screenWidth%2;
		entityCanvas.height = fxCanvas.height = renderCanvas.height = screenHeight = screenHeight-screenHeight%2;
		statusCanvas.height = STATUS_HEIGHT;
	};
	body.onresize();

	body.appendChild(statusCanvas);
	body.appendChild(renderCanvas);

	//------------------------------------------------------------------------------------------------------------------
	// Background & walls
	//------------------------------------------------------------------------------------------------------------------

	var TILE_FILL_COLOR = "#111";
	var TILE_LINE_COLOR = "#222";
	var TILE_LINE_COLOR_2 = "#333";
	var TILE_LINE_COLOR_3 = "#444";

	var WALL_COLOR = "#08e";//"#ddd";
	var VOID_COLOR = "#000";
	var COLLIDE_COLOR = "#8f8";
	var DANGER_COLOR = "#f02";


	var ELEMENT_COLORS = [
		//WATER
		["#aef","#5af"],
		//FIRE
		["#fa0","#f53"],
		//EARTH
		["#a64","#864" , "#fd7"],
		//AIR
		["rgba(255,255,255,0.5","#fff" , "#fff"],
		//NO ELEMENT
		["#ff6","#555"]
	];

	function buildBackground(){
		var tempCanvas = makeCanvas(TILE_SIZE, TILE_SIZE);
		var tempCtx = getContext(tempCanvas);

		//checkboard pattern
		fillRect(tempCtx,0,0,TILE_SIZE,TILE_SIZE,TILE_LINE_COLOR); //"#fff");
		fillRect(tempCtx,0,0,TILE_SIZE-1,TILE_SIZE-1,TILE_LINE_COLOR_2); //"#eee");
		fillRect(tempCtx,0,0,TILE_SIZE-2,TILE_SIZE-2,TILE_FILL_COLOR); //"#f8f8f8");
		fillRect(bgCtx,0,0,TOTAL_SIZE,TOTAL_SIZE, tempCanvas);

		//element overlay
		bgCtx.globalAlpha = 0.1;
		fillRect(bgCtx,0,TOTAL_SIZE-TABLE_HEIGHT-2,TOTAL_SIZE,TABLE_HEIGHT,ELEMENT_COLORS[WATER][1]);//WATER
		fillRect(bgCtx,TOTAL_SIZE-TABLE_HEIGHT-2,0,TABLE_HEIGHT,TOTAL_SIZE,ELEMENT_COLORS[FIRE][1]);//FIRE
		fillRect(bgCtx,0,0,TOTAL_SIZE,TABLE_HEIGHT,ELEMENT_COLORS[EARTH][1]);//EARTH
		fillRect(bgCtx,0,0,TABLE_HEIGHT,TOTAL_SIZE,ELEMENT_COLORS[AIR][1]);//AIR
		bgCtx.globalAlpha = 1;
		bgCtx.globalCompositeOperation = "source-over";

		//diagonal lines
		style(bgCtx,TILE_FILL_COLOR,TILE_LINE_COLOR_3,2);
		drawLine(bgCtx,0,0,TOTAL_SIZE,TOTAL_SIZE);
		drawLine(bgCtx,TOTAL_SIZE,0,0,TOTAL_SIZE);
		//middle circle
		drawCircle(bgCtx,HALF_SIZE,HALF_SIZE,8, YES,YES);
		//drawCircle(bgCtx,halfSize,halfSize,centerRadius,null,TILE_LINE_COLOR_3,1);

		var upChar = 0x21e7;
		var downChar = 0x21e9;
		var leftChar = 0x21e6;
		var rightChar = 0x21e8;

		function buildSide(x,y,t1,t2){
			//draw wall
			var m = 4;
			style(bgCtx,VOID_COLOR,WALL_COLOR,2);
			bgCtx.beginPath();
			bgCtx.moveTo( x(-m), y(-m) );
			bgCtx.lineTo( x(TABLE_HEIGHT+CORNER_RADIUS), y(-m) );
			bgCtx.lineTo( x(TABLE_HEIGHT+CORNER_RADIUS), y(TABLE_HEIGHT) );
			bgCtx.arcTo ( x(TABLE_HEIGHT+CORNER_RADIUS), y(TABLE_HEIGHT+CORNER_RADIUS),
				x(TABLE_HEIGHT), y(TABLE_HEIGHT+CORNER_RADIUS), CORNER_RADIUS);
			bgCtx.lineTo( x(-m), y(TABLE_HEIGHT+CORNER_RADIUS) );
			bgCtx.closePath();
			bgCtx.fill();
			bgCtx.stroke();

			//add wall entities
			addEntity( makeCircle( x(TABLE_HEIGHT), y(TABLE_HEIGHT), CORNER_RADIUS,BACKGROUND) );
			addEntity( makeLine( x(0), y(TABLE_HEIGHT+CORNER_RADIUS), x(TABLE_HEIGHT), y(TABLE_HEIGHT+CORNER_RADIUS), BACKGROUND ) );
			addEntity( makeLine( x(TABLE_HEIGHT+CORNER_RADIUS), y(0), x(TABLE_HEIGHT+CORNER_RADIUS), y(TABLE_HEIGHT), BACKGROUND ) );

			//draw arrows
			var char_ = x==identity ? leftChar : rightChar;
			bgCtx.font = "64px sans-serif";
			bgCtx.textAlign="center";
			bgCtx.textBaseline="middle";
			style(bgCtx,ELEMENT_COLORS[t1][1]);
			bgCtx.fillText(toChar(char_),x(TABLE_HEIGHT+CORNER_RADIUS+130)-2,y(50)-3);
			style(bgCtx,ELEMENT_COLORS[t2][1]);
			char_ = y==identity ? upChar : downChar;
			bgCtx.fillText(toChar(char_),x(50)-2,y(TABLE_HEIGHT+CORNER_RADIUS+130)-3);

			//draw element text
			bgCtx.font = "16px sans-serif";
			bgCtx.textAlign="center";
			bgCtx.textBaseline="middle";
			style(bgCtx,ELEMENT_COLORS[t1][1]);
			bgCtx.fillText(ELEMENT_TEXTS[t1],x(TABLE_HEIGHT+CORNER_RADIUS+30),y(12));
			style(bgCtx,ELEMENT_COLORS[t2][1]);
			bgCtx.fillText(ELEMENT_TEXTS[t2],x(16),y(TABLE_HEIGHT+CORNER_RADIUS+12));
		}
		buildSide(identity,identity,2,3);
		buildSide(identity,mirror,0,3);
		buildSide(mirror,identity,2,1);
		buildSide(mirror,mirror,0,1);


		//Also draw monster skins
		var s = MONSTER_SPRITE_SIZE;
		var s2 = s/2;
		var r = MONSTER_SPRITE_MARGIN;

		// ICE
		monsterCtx.translate(4, 4);
		style(monsterCtx,"#aef","#5af",2);
		monsterCtx.beginPath();
		monsterCtx.moveTo(s2,0);
		monsterCtx.quadraticCurveTo(s,-3,s,s2);
		monsterCtx.quadraticCurveTo(s,s+1,s2,s-2);
		monsterCtx.quadraticCurveTo(2,s,0,s2);
		monsterCtx.quadraticCurveTo(-3,-1,s2,0);
		monsterCtx.fill();
		monsterCtx.stroke();
		//White lines
		style(monsterCtx,NO,"#fff",2);
		drawLine(monsterCtx,8,4,4,20);
		drawLine(monsterCtx,16,2,8,26, 0,1);
		drawLine(monsterCtx,36,14,18,36, 0,1);
		drawLine(monsterCtx,38,18,26,36, 0,2);
		//eyes
		style(monsterCtx,NO,"#58f",2);
		drawLine(monsterCtx,s2-4,10,s2-4,18);
		drawLine(monsterCtx,s2+4,10,s2+4,18);
		//drawLine(monsterCtx,s2-8,6,s2+8,6);

		// FIRE
		monsterCtx.translate(s+8, 0);
		style(monsterCtx,"#fa0","#f00",2);
		monsterCtx.beginPath();
		monsterCtx.moveTo(s2,-4);
		monsterCtx.lineTo(s2+6,14);
		monsterCtx.lineTo(s-4,8);
		monsterCtx.quadraticCurveTo(s,s+3,s2,s-2);
		monsterCtx.quadraticCurveTo(2,s,4,8);
		monsterCtx.lineTo(s2-6,14);
		monsterCtx.lineTo(s2,-4);
		monsterCtx.fill();
		monsterCtx.stroke();
		//eyes
		drawLine(monsterCtx,s2-3,26,s2-8,20);
		drawLine(monsterCtx,s2+3,26,s2+8,20);

		//SAND
		monsterCtx.translate(s+8, 0);
		style(monsterCtx,"#fd7","#d72",2);
		monsterCtx.beginPath();
		monsterCtx.moveTo(s2,0);
		monsterCtx.quadraticCurveTo(s,10,s-8,s-8);
		monsterCtx.quadraticCurveTo(s,s+1,s2+2,s-6);
		monsterCtx.quadraticCurveTo(14,s-12,2,s-4);
		monsterCtx.quadraticCurveTo(-2,s-10,4,s2);
		monsterCtx.quadraticCurveTo(0,0,s2,0);
		monsterCtx.fill();
		monsterCtx.stroke();
		//Dots
		style(monsterCtx,"#d72");
		drawCircle(monsterCtx,10,7,1,YES);
		drawCircle(monsterCtx,24,9,1,YES);
		drawCircle(monsterCtx,7,20,1,YES);
		drawCircle(monsterCtx,20,14,1,YES);
		drawCircle(monsterCtx,8,30,1,YES);
		drawCircle(monsterCtx,28,32,1,YES);
		//eyes
		style(monsterCtx,"#000","#d72",1);
		for(var i=0;i<2;i++){
			var fill;
			if(i===0){
				monsterCtx.globalCompositeOperation = "destination-out";
				fill = YES;
			}else{
				monsterCtx.globalCompositeOperation = "source-over";
				fill = NO;
			}
			monsterCtx.scale(1, 3/2);
			drawCircle(monsterCtx,13,14,4,fill,YES);
			monsterCtx.scale(1, 2/3);
			//monsterCtx.stroke();
			monsterCtx.scale(1, 3/2);
			drawCircle(monsterCtx,26,14,4,fill,YES);
			monsterCtx.scale(1, 2/3);
			//monsterCtx.stroke();
		}

		//GLASS
		monsterCtx.translate(s+8, 0);

		monsterCtx.lineCap = "round";
		//sphere
		style(monsterCtx,0,"#fff",2);
		drawCircle(monsterCtx,s2,s2,s2-4,NO,YES);
		//Reflection
		style(0,0,1);
		monsterCtx.beginPath();
		monsterCtx.arc(s2, s2, s2-8, 3.2, 4.4);
		monsterCtx.stroke();
		//eyes
		drawCircle(monsterCtx,s2-4,s2+4,4,NO,YES);
		drawCircle(monsterCtx,s2+4,s2+4,4,NO,YES);
	}



	//------------------------------------------------------------------------------------------------------------------
	// game logic
	//------------------------------------------------------------------------------------------------------------------
	//Shapes
	var CIRCLE = "c",
		LINE = "l";
	//kinds
	var BALL = "b",
		BACKGROUND = "bg",
		BUMPER = "bp",
		OBSTACLE = "o",
		PADDLE = "p",
		MONSTER = "m",
		RING = "ring";

	//used for entity.elt
	var WATER = 0;
	var FIRE = 1;
	var EARTH = 2;
	var AIR = 3;
	var NO_ELEMENT = 4;
	var ELEMENT_TEXTS = ["Water","Fire","Earth","Air"];

	var killMap = {};
	killMap[WATER] = FIRE;
	killMap[FIRE] = WATER;
	killMap[EARTH] = AIR;
	killMap[AIR] = EARTH;

	var MONSTER_RADIUS = 38;
	var BALL_RADIUS = 16;
	var RING_RADIUS = 8;

	//ball,walls,slopes,padles (everything that isn't added/removed)
	var entities;
	var monsters;
	var rings;
	var ball;
	var pads;
	var movingBumpers;

	var MAX_LIVES = 5;
	var lives;
	var startTime;
	var monsterEaten;

	var STATUS_TEXT_DURATION = 50;
	var ringCpt;
	var ringStatus;
	var lostLifeCpt;
	var hurtCpt;

	var gameIsOver = false;

	//Start seq via right button
	var started = false;
	var START_CPT_MAX = 100;
	var startCpt = 0;
	var startPulse = 0;
	var startAngle = 0;
	var restartCpt = 0;

	//basic physics settings
	var MAX_SPEED = 10;
	var GRAVITY = 0.2;
	var IDLE_MONSTER_SPEED = 1;


	//boost settings (paddle and left click)
	var MIN_BOOST_CPT = 1;
	var BOOST_CPT_BONUS = 12;
	var MIN_BOOST_SPEED = 0.2*MAX_SPEED;
	var BOOST_SPEED_BONUS = 0.8*MAX_SPEED;

	var ballBoostX = 0;
	var ballBoostY = 0;
	var ballBoostCpt = 0;
	var ballBoostType;
	var CAN_BOOST_DURATION = 150;
	var canBoostCpt;

	//line equation
	var tempLineEq = {};
	//temp vector used by physics
	var tempVector = {}; //Temp var, return value for collision detection

	//input
	var keys = {};
	var mouse = {};

	//------------------------------------------------------------------------------------------------------------------
	// main loop
	//------------------------------------------------------------------------------------------------------------------

	function init(){
		restartCpt = 0;
		monsterEaten = 0;
		startTime = Date.now();
		startCpt = 0;
		started = false;
		lives = MAX_LIVES;
		canBoostCpt = 0;
		entities = [];
		monsters = [];
		buildBackground();
		buildObjects();
	}

	function processInput(){

		//boost sequence
		if(!started && !restartCpt){
			if(mouse.right || keys.space){
				if(startCpt<START_CPT_MAX){
					startCpt++;
				}
			}else{
				if(startCpt>0){
					var boostRatio = 0.1 + 0.9*startCpt / START_CPT_MAX;
					//Space boost: based on space held down duration + random x nudge
					var speed = MIN_BOOST_SPEED+BOOST_SPEED_BONUS*boostRatio;
					ballBoostX = speed*Math.cos(startAngle);
					ballBoostY = speed*Math.sin(startAngle);
					ballBoostCpt = MIN_BOOST_CPT+BOOST_CPT_BONUS*boostRatio;
					started = true;
					ballBoostType = "start";
					//console.log(boostRatio,startAngle,ball);
				}
			}
		}

		//Paddles
		for(var i=0;i<pads.length;i++){
			var pad = pads[i];
			var left = !pad.mirror;
			var move;
			if(pad.elt==1){
				move = !left ? keys.down || keys.left : keys.up || keys.right;
			}else{
				move = left ? keys.up || keys.left : keys.down || keys.right;
			}

			var dx = pad.ux; //Vector going from pad pivot to pad edge
			var dy = pad.uy;
			pad.cpt = pad.cpt || 0;
			var maxCpt = 9; //num frames from start to max pos (keep an odd value to avoid an annoying bug with straight position...)
			pad.max = false;

			if(move){
				if(pad.cpt<maxCpt){
					pad.cpt++;
				}else{
					pad.max = true;
				}
			}else{
				if(pad.cpt>0){
					pad.cpt--;
				}
			}

			pad.prevX2 = pad.x2;
			pad.prevY2 = pad.y2;
			pad.movingUp = move && !pad.max;
			pad.moving = pad.cpt!==0;
			if(pad.cpt>0){
				var angle = pad.amax *(pad.cpt/maxCpt);
				if(pad.mirror) angle*=-1;
				var cos = Math.cos(angle);
				var sin = Math.sin(angle);
				dx = pad.ux * cos - pad.uy * sin;
				dy = pad.ux * sin + pad.uy * cos;
			}

			pad._ux = dx; //applied ux/uy
			pad._uy = dy;
			pad.x2 = pad.x+dx;
			pad.y2 = pad.y+dy;


		}


		//DEBUG teleport
		if(mouse.middle){
			startCpt = 0;
			started = true;
			ball.x = mouse.x;
			ball.y = mouse.y;
			ball.v.x = ball.v.y = 0;
			ballBoostCpt = 0;
			mouse.middle = false;
			//console.log("mouse teleport",ball);
		}



		//left click boost
		if(mouse.left && ball.elt != NO_ELEMENT && ballBoostCpt===0 && canBoostCpt>0){
			tempVector.x = mouse.x-ball.x;
			tempVector.y = mouse.y-ball.y;
			normalize(tempVector, MIN_BOOST_SPEED +0.5*BOOST_SPEED_BONUS);
			ball.v.x = tempVector.x;
			ball.v.y = tempVector.y;

			//ballBoostCpt = MIN_BOOST_CPT+0.8*BOOST_CPT_BONUS;
			ballBoostCpt = 10;
			ballBoostX = ball.v.x;
			ballBoostY = ball.v.y;
			ballBoostType = "click";

			mouse.left = false;
		}
		if(canBoostCpt>0){
			canBoostCpt--;
		}
	}

	function updateBumpers(){
		var i,len, e;

		//rotate moving bumpers
		len=movingBumpers.length;
		for(i=0 ; i<len ; i++){
			e = movingBumpers[i];

			e.a += e.da;
			//moving bumper
			e.x = HALF_SIZE+Math.cos(e.a)* e.d;
			e.y = HALF_SIZE+Math.sin(e.a)* e.d;
		}
	}

	function updateMonsters(){
		var i,len, e, dx,dy;

		//move monsters
		len=monsters.length;
		for(i=0 ; i<len ; i++){
			e = monsters[i];

			if(e.elt!=ball.elt && ball.elt!=NO_ELEMENT){
				var dist = pyth(ball.x - e.x, ball.y - e.y);
				if(dist<200){
					//ball is within IA range
					if(e.elt == killMap[ball.elt]){
						//go hide home
						e.tx = e.hx;
						e.ty = e.hy;
					}else{
						//attack player
						e.tx = ball.x;
						e.ty = ball.y;
					}
				}
			}
			dx = e.tx- e.x;
			dy = e.ty - e.y;
			if(dx*dx + dy*dy < 25){
				//reached target => define new target on the circle
				var angle = rand()*PI*2;
				e.tx = HALF_SIZE + Math.cos(angle)*RING_ZONE_RADIUS;
				e.ty = HALF_SIZE + Math.sin(angle)*RING_ZONE_RADIUS;
			}else{
				//move toward target
				var d = pyth(dx,dy);
				e.x += dx*IDLE_MONSTER_SPEED/d;
				e.y += dy*IDLE_MONSTER_SPEED/d;
			}
		}
	}

	function updateBall(){
		var i,len, e,eLen;
		//Update ball physics
		if(started){
			//Compute gravity
			var gx = 0;
			var gy = 0;
			var gravity = GRAVITY;
			var maxSpeed = MAX_SPEED;
			//distance to screen center


			dx = HALF_SIZE - ball.x;
			dy = HALF_SIZE - ball.y;
			var range = screenWidth/2;
			var distanceToCenter = pyth(dx,dy);
			if(distanceToCenter < range){
				//Reduce the gravity as we go towards the center
				//normalize
				dx/=distanceToCenter;
				dy/=distanceToCenter;
				gravity *= (0.2+0.8*distanceToCenter/range); //Close to the center, gravity gets weaker
				maxSpeed *= (0.5+0.5*distanceToCenter/range);
			}

			/*
			 if(ballBoostCpt>0){
			 gravity = 0;
			 }
			 */

			//applied gravity depends on which quadrant the ball is in
			var x = ball.x - HALF_SIZE,
				y = ball.y - HALF_SIZE;

			if(y>x){ //bottom left
				if(y>-x){ //bottom right
					gy = gravity; //bottom
				}else{
					gx = -gravity; // left
				}
			}else{  //top right
				if(y>-x){ //bottom right
					gx = gravity; //right
				}else{
					gy = -gravity; // top
				}
			}
			//Add gravity to speed
			ball.v.x += gx;
			ball.v.y += gy;

			//Apply boost
			if(ballBoostCpt>0){
				ballBoostCpt--;
				ball.v.x += ballBoostX;
				ball.v.y += ballBoostY;
			}

			//make sure speed can't be too high
			if(ball.v.x*ball.v.x+ball.v.y*ball.v.y > maxSpeed*maxSpeed){
				normalize(ball.v,maxSpeed);
			}
			//update position based on speed
			ball.x += ball.v.x;
			ball.y += ball.v.y;

			ball.x = Math.round(ball.x);
			ball.y = Math.round(ball.y);


			//ball collisions (CAUTION: the following code is more about cuisine than physics)
			ball.collide = false;
			eLen = entities.length;
			len = eLen + monsters.length;
			for(i=0 ; i<len ; i++){
				if(i<eLen){
					e = entities[i];
				}else{
					e = monsters[i-eLen];
				}
				if(e != ball){
					e.collide = false;
					var l;
					var collisionVector = tempVector;
					if(e.shape==CIRCLE){

						if(collideCircle(ball,e)){

							//handle collision with monster
							if(e.kind == MONSTER){
								if(killMap[ball.elt] == e.elt && !e.dead){
									//ball kills monster of opposite element
									e.dead = true;
									//ball.elt = NO_ELEMENT;
									canBoostCpt = CAN_BOOST_DURATION;
									monsterEaten++;
								}

								if(e.dead /*e.elt==ball.elt*/){
									//no collision with dead element
									continue;
								}
							}

							e.collide = true;
							//compute vector going from entity center to ball center
							collisionVector.x = ball.x- e.x;
							collisionVector.y = ball.y- e.y;
							l = pyth(collisionVector.x,collisionVector.y);

							if(e.kind == BUMPER && ball.elt != NO_ELEMENT){
								canBoostCpt += 50;
								if(canBoostCpt > CAN_BOOST_DURATION){
									canBoostCpt = CAN_BOOST_DURATION;
								}
							}

							if(e.kind == MONSTER){
								if(e.elt != ball.elt){
									hurtCpt = STATUS_TEXT_DURATION;
									ball.elt = NO_ELEMENT;

									//else it loses a ring
									if(rings.n<rings.length){
										rings.n++;
										var ring = rings[rings.n-1];
										ring.m = e;
										ring.dx = collisionVector.x * (MONSTER_RADIUS-RING_RADIUS)/l;
										ring.dy = collisionVector.y * (MONSTER_RADIUS-RING_RADIUS)/l;

										ringCpt = STATUS_TEXT_DURATION;
										ringStatus = -1;
									}
								}
							}


							//compute how much do we need to move ball to put it out of collision
							collisionVector.l = e.r+ball.r-l;
							//and normalize vector
							collisionVector.x = collisionVector.x/l;
							collisionVector.y = collisionVector.y/l;
						}
					}else if(e.shape==LINE){

						var risingPad = e.kind == PADDLE && e.movingUp;
						if(!risingPad && collideLine(ball,e,collisionVector)){
							//collision with a slope or an inactive paddle
							e.collide = true;

							//We need to check if ball passed through the line
							// B is the ball center, E is the projection of B on the line entity
							//collisonVector is EC
							//pb ball may have pierced through line and its center might be on the other side
							//fix: check if the angle between collisonVector and speed is obtuse (hasn't pierced) or acute (has pierced)
							computeLineEq(tempLineEq, e.x, e.y, e.x2, e.y2);
							//NOTE: this works even on reversed/mirror tables because  the slop doesn't change
							var pierced = checkAboveLineEq(tempLineEq,ball.x,ball.y) !== checkAboveLineEq(tempLineEq,ball.prevX,ball.prevY);
							if(pierced<=0){
								//hasn't pierce
								l = ball.r-collisionVector.l;
								//console.log("hasn't pierced");
							}else{
								//pierced
								l = ball.r+collisionVector.l;
								collisionVector.x *= -1;
								collisionVector.y *= -1;
								//console.log("pierced !!!");
							}


							//normalize vector and save its length
							collisionVector.x /= collisionVector.l;
							collisionVector.y /= collisionVector.l;
							collisionVector.l = l;
						}
						if(risingPad){
							// Check collisions with moving pad differently
							// I think I overcomplicated things and should have checked collision with pad before/pad after and ball before/ball after instead
							// it is working correctly now, so no need to change it

							//Do a normal collsion check with current position
							var collide = collideLine(ball,e,collisionVector);
							var reverse = (e.elt==1 || e.elt==3);
							var aboveBefore,aboveAfter;
							if(!collide){
								//No collision, but since the paddle moved, maybe the ball went through
								//Check if we are between the two paddle position
								computeLineEq(tempLineEq, e.x, e.y, e.prevX2, e.prevY2);
								aboveBefore = checkAboveLineEq(tempLineEq,ball.prevX,ball.prevY, reverse);

								computeLineEq(tempLineEq, e.x, e.y, e.x2, e.y2);
								aboveAfter = checkAboveLineEq(tempLineEq,ball.x,ball.y, reverse);
							}

							if(collide || aboveBefore!==aboveAfter){
								//ball center is between the two lines
								var dx = ball.x-e.x;
								var dy = ball.y- e.y;
								var dotProd = dx*e._ux + dy* e._uy;
								if(collide || dotProd>0){
									//ball center is on the good side of the pad pivot
									if(collide || dx*dx+dy*dy < e.l* e.l ){
										//ball center is inside pad circle
										e.collide = true;

										//project ball center on paddle
										//DotProd = cos(angle)*|d|*|e.l|
										var d = pyth(dx,dy);
										//distance from pad pivot to projected center
										var dproj = dotProd/e.l;
										//collisionVector = projected point
										collisionVector.x = e.x + dproj*e._ux/e.l;
										collisionVector.y = e.y + dproj*e._uy/e.l;
										//Actual collision vector
										collisionVector.x = ball.x - collisionVector.x;
										collisionVector.y = ball.y - collisionVector.y;
										collisionVector.l = pyth(collisionVector.x,collisionVector.y);
										//normalize
										collisionVector.x /= collisionVector.l;
										collisionVector.y /= collisionVector.l;

										//pb, we don't know which direction it should go
										//Compute normale
										var nx = e._uy/e.l;
										var ny = -e._ux/e.l;
										// multiply by -1 when it seems to be needed...
										if(e.mirror && (e.elt===0 || e.elt==3) || !e.mirror && (e.elt==1 || e.elt==2)){
											nx*=-1;
											ny*=-1;
										}
										var nDotProd = nx*collisionVector.x + ny*collisionVector.y;
										if(nDotProd<0){
											//reverse collision vector
											collisionVector.x *= -1;
											collisionVector.y *= -1;
										}

										//collision vector brings us to the circle center, but we want the edge
										collisionVector.l = collisionVector.l + ball.r;
										//console.log("went through moving paddle",collisionVector.x,collisionVector.y,collisionVector.l);

										// We now have a collisionVector and need to compute how ball velocity should be affected

										//first, move ball out of the paddle
										//(results in a "sticky" paddle effect which is a little annoying but better than the ball passing through the paddle)
										ball.x += collisionVector.x * collisionVector.l;
										ball.y += collisionVector.y * collisionVector.l;
										ball.collide = true;

										//apply a speed boost proportional to the distance between the pad pivot and ball contact point
										// 0 at the pivot, 1 at the edge
										var boostRatio = dproj/e.l;
										// make it less linear to make the boost more important on the edge
										boostRatio = 0.1+0.9*(0.3*boostRatio+0.7*boostRatio*boostRatio); //interpolate somewhere between y=x and y=x^2

										//Compute boost
										var boostCpt = MIN_BOOST_CPT + (boostRatio*BOOST_CPT_BONUS) >> 0;
										var speed = MIN_BOOST_SPEED + BOOST_SPEED_BONUS*boostRatio; //reach 60% of max speed
										var boostX = collisionVector.x*speed;
										var boostY = collisionVector.y*speed;

										if(!ballBoostCpt || ballBoostType != PADDLE){
											//initial boost
											//console.log("=============");
											ballBoostCpt = boostCpt;
											ballBoostX = boostX;
											ballBoostY = boostY;
										}else{
											//add a part of previous boost (give big priority to initial impact)
											ballBoostCpt = boostCpt;
											ballBoostX = 0.2*boostX + ballBoostX;
											ballBoostY = 0.2*boostY + ballBoostY;
										}
										ballBoostType = PADDLE;
										canBoostCpt = CAN_BOOST_DURATION;
										//console.log("boostRatio",boostRatio,ballBoostCpt,"=>",ballBoostX,ballBoostY);

										//randomize a little to avoid trajectories too often the same
										ballBoostX *= (0.8+rand()*0.4);
										ballBoostY *= (0.8+rand()*0.4);

										ball.elt = e.elt;
										continue;
									}
								}
							}
						}
					}
					if(e.collide){
						ballBoostCpt = 0;
						ball.collide = true;
						e.colCpt = 20; //used to change color on collided bumpers

						//collisonVector is the the normalized vector indicating how much we need to move the ball in order to remove collision
						// => move out of collision
						ball.x += collisionVector.x * collisionVector.l;
						ball.y += collisionVector.y * collisionVector.l;

						//now we want to compute how velocity is affected
						//normalize ball velocity vector
						var vl = pyth(ball.v.x,ball.v.y);
						var vx = ball.v.x/vl;
						var vy = ball.v.y/vl;

						//compute the normal vector
						var normaleX = -collisionVector.y;
						var normaleY = collisionVector.x;
						var normaleDotProd = normaleX*vx + normaleY*vy;
						if(normaleDotProd<0){
							normaleX = -normaleX;
							normaleY = -normaleY;
						}

						//compute angle between ball velocity and tempVector (cross product)
						//the cos is the part of the speed that goes towards the collision point, it can be absorbed or bounced
						var cos = vx*collisionVector.x + vy*collisionVector.y;
						if(cos<0) cos = -cos;
						//the sin part is parallel to the contact surface
						var sin = Math.sin(Math.acos(cos));
						if(sin<0) sin=-sin;

						var bounciness =  0.2;


						if(e.kind==BUMPER){
							bounciness = 1.1;
						}else if(e.kind==MONSTER){
							bounciness = 1.1;
						}
						collisionVector.x *= cos * bounciness * vl;
						collisionVector.y *= cos * bounciness * vl;
						normaleX *= sin * vl;
						normaleY *= sin * vl;
						ball.v.x = collisionVector.x + normaleX;
						ball.v.y = collisionVector.y + normaleY;
					}
				}
			}
			ball.prevX = ball.x;
			ball.prevY = ball.y;
		}
	}

	function updateRings(){
		//rings
		var ring;
		var ballRadProd = (BALL_RADIUS+RING_RADIUS)*(BALL_RADIUS+RING_RADIUS);
		var ballAttractionProd = ballRadProd*2;
		var monsterRadProd = (BALL_RADIUS-MONSTER_RADIUS)*(BALL_RADIUS-MONSTER_RADIUS);
		var lenMonsters = monsters.length;
		for(var i=0 ; i<rings.n ; i++){
			ring = rings[i];
			//Check ball collision first
			var rx = ring.x-ball.x;
			var ry = ring.y-ball.y;
			var prod = rx*rx + ry*ry;
			if(prod < ballRadProd){
				ring.m = null;
				//catch ring !
				//remove by swapping
				rings[i] = rings[rings.n-1];
				rings[rings.n-1] = ring;
				i--;
				rings.n--;

				ringCpt = STATUS_TEXT_DURATION;
				ringStatus = 1;
				if(rings.n===0){
					gameIsOver = true;
				}
			}else{
				if(prod < ballAttractionProd){
					//ball attracts rings
					ring.x = ring.x - rx*0.3;
					ring.y = ring.y - ry*0.3;
				}
				if(!ring.m){
					//check monsters collisions
					for(var j= 0 ; j<lenMonsters ; j++){
						var monster = monsters[j];
						rx = ring.x - monster.x;
						ry = ring.y - monster.y;
						prod = rx * rx + ry *ry;
						if(prod < monsterRadProd){
							//monster catches the ring
							ring.m = monster;
							ring.dx = rx;
							ring.dy = ry;
						}
					}
				}else{
					if(ring.m.dead){
						ring.m = null;
					}else{
						ring.x = ring.m.x + ring.dx;
						ring.y = ring.m.y + ring.dy;
					}
				}
			}
		}
	}

	function update(){
		updateBumpers();
		updateMonsters();
		updateBall();
		updateRings();
	}

	function updateCamera(){
		prevCameraX = cameraX;
		prevCameraY = cameraY;

		/*
		cameraX = HALF_SIZE-screenWidth/2;
		cameraY = HALF_SIZE-screenHeight/2;
		if(1) return;
		*/

		//Objectives:
		// - limit camera movement as much as possible
		// - keep ball as close to center as possible
		// - avoid camera "jumps"

		//define camera center
		var x = ball.x;
		var y = ball.y;
		//change origin to screen center
		var ox = x-HALF_SIZE;
		var oy = y-HALF_SIZE;

		var absox = ox;
		var absoy = oy;
		if(absox<0) absox*=-1;
		if(absoy<0) absoy*=-1;

		var range = TABLE_WIDTH/2 + CORNER_RADIUS;
		if(absox<range && absoy<range){
			//We are inside the center square
			//change origin to the table corner instead
			var cx = absox-range;
			var cy = absoy-range;
			var prod = cx*cx+cy*cy;
			if(prod<range*range){
				//position is inside the circle => project position on the circle
				var rlen = sqrt(prod);
				cx =cx*range/rlen;
				cy =cy*range/rlen;
				//convert back to center coordinates
				x = cx + range;
				y = cy + range;
				if(ox<0) x = -x;
				if(oy<0) y = -y;
				//convert back to world coordinates
				x = HALF_SIZE + x;
				y = HALF_SIZE + y;
			}//else outside the circle, means close enough to the center, no snapping
		}else{
			//Snap to closest line
			if(absox<absoy){
				x=HALF_SIZE;
			}else{
				y=HALF_SIZE;
			}
		}
		//make sure ball stays close to the center
		x = clamp(x, ball.x - screenWidth*0.3, ball.x + screenWidth *0.3);
		y = clamp(y, ball.y - screenHeight*0.3, ball.y + screenHeight *0.3);
		//stay within scene bounds
		x = clamp(x - screenWidth/2, 0, TOTAL_SIZE-screenWidth);
		y = clamp(y - screenHeight/2, 0, TOTAL_SIZE-screenHeight);

		if(started){
			//smooth transition to ideal position
			cameraX += (x-cameraX)*0.1;
			cameraY += (y-cameraY)*0.1;
		}else{
			cameraX = x;
			cameraY = y;
		}
		//cameraX = cameraX >>0;
		//cameraY = cameraY >>0;
	}


	function render(){
		var drawFx = started;
		clearCanvas(renderCtx);
		clearCanvas(entityCtx);

		var i,len;
		if(drawFx){
			//save fxCtx
			drawImage(renderCtx,fxCanvas,0,0);
			//clear fxCtx
			fxCtx.clearRect(0,0,screenWidth,screenHeight);
			//drawCircle(fxCtx,0,0,1500,"red");
			//draw backup canvas with lower opacity
			fxCtx.save();
			fxCtx.globalAlpha = 0.9;
			drawImage(fxCtx,renderCanvas,-cameraX+prevCameraX,-cameraY+prevCameraY);
			fxCtx.restore();
			//clean render again
			clearCanvas(renderCtx);

			style(fxCtx, ELEMENT_COLORS[ball.elt][1]);
			if(ballBoostCpt>0){
				//Draw boost afterburner
				drawCircle(fxCtx,ball.prevX-cameraX,ball.prevY-cameraY,6,YES);
			}else{
				drawCircle(fxCtx,ball.x-cameraX,ball.y-cameraY,2, YES);
			}
		}else{
			clearCanvas(fxCtx);
		}

		//draw rings
		rings.cpt++;
		//pulse color
		var color = 0xaa + Math.cos(rings.cpt/20)*0x22 >> 0;
		color = color.toString(16);
		style(entityCtx,null,"#"+color+color+"00",2);

		var twoPi = 2*PI;
		var minx = cameraX-RING_RADIUS;
		var maxx = cameraX+screenWidth+RING_RADIUS;
		var miny = cameraY-RING_RADIUS;
		var maxy = cameraY+screenWidth+RING_RADIUS;
		var rx,ry;
		for(i=0 ; i<rings.n ; i++){
			var ring = rings[i];
			rx = ring.x;
			ry = ring.y;
			if( rx>minx && rx<maxx && ry>miny && ry<maxy){
				entityCtx.beginPath();
				entityCtx.arc(rx-cameraX,ry-cameraY,RING_RADIUS,0,twoPi);
				entityCtx.stroke();
			}
		}

		//draw monsters
		var size = (MONSTER_SPRITE_SIZE+MONSTER_SPRITE_MARGIN*2);
		for(i=0, len=monsters.length ; i<len ; i++){
			var m = monsters[i];
			var a = 1;

			if(m.dead){
				//dead monster
				m.cpt-=10; //fade out faster than fade in
				if(m.cpt<=0){
					//monster has finshed dying !
					// => respawn
					spawnMonster(m);
				}else{
					//Fade out
					a = m.cpt/50;
				}
			}else{
				if(m.cpt<50){
					//Fade in monster
					m.cpt++;
					a = m.cpt/50;
				}
			}
			if(m.colCpt>0){
				m.colCpt--;
			}

			var vulnerable = killMap[ball.elt] == m.elt;
			var same = ball.elt == m.elt;

			//Draw halo for elements that are not the same as the current ball element
			style(entityCtx,
				same ? VOID_COLOR : vulnerable ? ELEMENT_COLORS[m.elt][0] : DANGER_COLOR,
				same ? (m.colCpt>0 ? COLLIDE_COLOR : WALL_COLOR) : DANGER_COLOR, //ELEMENT_COLORS[m.elt][2] || ELEMENT_COLORS[m.elt][0],	//added a third value to tweak border color of monsters
				2);
			entityCtx.globalAlpha = a * (same ? 0.5 : vulnerable ? 0.2 : 0.4);
			drawCircle(entityCtx, m.x-cameraX, m.y-cameraY, m.r,YES);
			if(m.elt==AIR){
				//We want air inner sprite to be transparent
				entityCtx.globalAlpha = 1;
				entityCtx.globalCompositeOperation = "destination-out";
				drawCircle(entityCtx, m.x-cameraX, m.y-cameraY, 17,YES);
				entityCtx.globalCompositeOperation = "source-over";
			}


			//Apply cpt fade for basic destroy/appear fade
			entityCtx.globalAlpha = a;

			if(!vulnerable){
				//incompatible element have a border
				drawCircle(entityCtx, m.x-cameraX, m.y-cameraY, m.r,NO,YES);
			}

			entityCtx.globalAlpha = a * (same ? 0.4 : vulnerable ? 0.7 : 1);


			dx = 0;
			dy = 0;
			if(vulnerable){
				//Shake in fear !
				dx = 3*(Math.random()-0.5);
				dy = 3*(Math.random()-0.5);
			}

			if(same){
				//non targetable element are faded out
				entityCtx.globalAlpha = a * 0.4;
			}
			entityCtx.drawImage(monsterCanvas,
				m.elt*size,0,size,size,
				m.x-size/2 - cameraX + dx,
				m.y-size/2 - cameraY + dy,
				size,size
			);

			//drawCircle(entityCtx, m.x-cameraX, m.y-cameraY, m.r,null,ELT_COLORS[m.elt][0]);
		}
		entityCtx.globalAlpha = 1;

		var dx,dy;
		for(i=0 , len=entities.length ; i<len ; i++){
			var e = entities[i];
			var x = e.x-cameraX;
			var y = e.y-cameraY;
			var fill, stroke, lineWidth;
			if(e!=ball){

				if(e.shape == CIRCLE && e.kind == BUMPER){
					if(e.colCpt>0){
						e.colCpt--;
						stroke = COLLIDE_COLOR;
					}else{
						stroke = WALL_COLOR;
					}
					style(entityCtx,"#000",stroke, 2);
					drawCircle(entityCtx,x,y, e.r,YES,YES);
				}else if(e.shape == LINE){
					if(e.kind!=BACKGROUND){ //side walls are dawn in background
						stroke = WALL_COLOR;
						if(e.kind==PADDLE){
							stroke = ELEMENT_COLORS[e.elt][1];
						}
						style(entityCtx,0,stroke,2);
						drawLine(entityCtx, e.x-cameraX, e.y-cameraY, e.x2-cameraX, e.y2-cameraY);
					}
				}
			}
		}

		//Draw ball
		if(!restartCpt){
			//mouth orientation
			var angle;
			if(!started){
				angle = ball.sa;
				startPulse+=0.05;
			}else{
				angle = Math.atan2(ball.v.y,ball.v.x);
				startPulse = 0;
			}

			//mouth open angle and direction
			ball.cpt = (++ball.cpt)%20;
			var dAngle = ball.cpt;
			if(dAngle>10) dAngle = 20-dAngle;
			if(!started){
				//while starting, mouth open angle depends on the current boost power
				dAngle = 2+8*(startCpt/START_CPT_MAX);
				//mouth orientation changes with time
				angle += Math.cos(startPulse)*PI/3;
				startAngle = angle; //it defines the boost direction
			}
			dAngle *= 0.3*PI/10;

			//Shake when starting
			dx = 0;
			dy = 0;
			if(startCpt>0 && !started){
				var shake = clamp(startCpt/START_CPT_MAX,0,1)*4;
				dx = shake*rand();
				dy = shake*rand();
			}
			if(ball.elt != NO_ELEMENT && canBoostCpt>0){
				//Draw wings
				//Draw cute wings
				entityCtx.save();
				entityCtx.translate(ball.x-cameraX +dx,ball.y-cameraY +dy);
				entityCtx.rotate(angle);
				style(entityCtx,"#fff","#000",1);
				entityCtx.beginPath();
				entityCtx.arc(-10,0,20,0,2.2);
				entityCtx.lineTo(0,0);
				entityCtx.arc(-10,0,20,-0,-2.2,true);
				entityCtx.lineTo(0,0);
				entityCtx.closePath();
				entityCtx.fill();
				entityCtx.stroke();

				entityCtx.globalCompositeOperation = "destination-out";
				drawCircle(entityCtx,0,0,BALL_RADIUS,"#fff");
				entityCtx.restore();
			}
			//draw camembert
			if(hurtCpt>0){
				style(entityCtx, ELEMENT_COLORS[ball.elt][0], DANGER_COLOR,3);
			}else{
				style(entityCtx, ELEMENT_COLORS[ball.elt][0], ELEMENT_COLORS[ball.elt][1],2);
			}
			if(dAngle===0){
				drawCircle(entityCtx,
					ball.x-cameraX +dx,
					ball.y-cameraY +dy,
					BALL_RADIUS,YES,YES);
			}else{
				drawCamembert(entityCtx, ball.x-cameraX +dx, ball.y-cameraY +dy, ball.r, angle, dAngle, YES, YES);
			}
		}


		/*
		//if(ballBoostCpt>0){
			style(entityCtx,0,"red",2);
			drawLine(entityCtx, ball.x-cameraX, ball.y-cameraY , ball.x+ballBoostX*300-cameraX,ball.y+ballBoostY*300-cameraY);
		//}
		if(mouse.left){
			style(bgCtx,"red");
			drawCircle(bgCtx,mouse.x,mouse.y,5,true,true);
		}
		*/

		//compose final rendering
		drawImage(renderCtx, bgCanvas, -cameraX, -cameraY);
		if(drawFx) drawImage(renderCtx, fxCanvas, 0, 0);
		drawImage(renderCtx, entityCanvas, 0, 0);
	}

	function checkGame(){
		//Detect ball out of screen ie player losing
		//bring back to the screen and prepare start sequence
		var stop = false;
		if(ball.x+BALL_RADIUS<0){
			stop = true;
			ball.x = 50;
			ball.y = HALF_SIZE;
			ball.sa = 0; //define starting angle
		}else if(ball.x-BALL_RADIUS>TOTAL_SIZE){
			stop = true;
			ball.x = TOTAL_SIZE-50;
			ball.y = HALF_SIZE;
			ball.sa = -PI;
		}else if(ball.y+BALL_RADIUS<0){
			stop = true;
			ball.y = 50;
			ball.x = HALF_SIZE;
			ball.sa = PI/2;
		}else if(ball.y-BALL_RADIUS>TOTAL_SIZE){
			stop = true;
			ball.y = TOTAL_SIZE-50;
			ball.x = HALF_SIZE;
			ball.sa = -PI/2;
		}
		if(stop){
			started = false;
			startCpt = 0;
			ball.elt = NO_ELEMENT;
			ball.v.x = 0;
			ball.v.y = 0;

			lostLifeCpt = STATUS_TEXT_DURATION;

			restartCpt = START_CPT_MAX;

			lives--;
			if(lives === 0){
				gameIsOver = true;
			}
		}
		if(restartCpt>0){
			restartCpt--;
		}
	}

	function renderStatus(){
		clearCanvas(statusCtx);

		//Draw lives
		var i,len;
		var size = 9;
		var margin = 14;
		for(i=0 ; i<lives ; i++){
			style(statusCtx,ELEMENT_COLORS[NO_ELEMENT][0],"red");
			drawCamembert(statusCtx, 50 + STATUS_HEIGHT/2 + i * (size+margin), STATUS_HEIGHT/2, size, 0, 0.3, true);
		}

		if(hurtCpt>0){
			hurtCpt--;
		}

		//Draw boost gauge
		if(started){//} canBoostCpt>0 && ball.elt!=NO_ELEMENT){
			var height = 20;
			var width = 102;
			var x =(screenWidth-width)/2 ;
			var y =(STATUS_HEIGHT-height)/2;


			style(statusCtx, TILE_LINE_COLOR_2);
			fillRect(statusCtx,x,y,width,height);
			if(hurtCpt){
				style(statusCtx, "#f00");
				statusCtx.globalAlpha = (hurtCpt/START_CPT_MAX);
				fillRect(statusCtx,x-2,y-2,width+4,height+4);
				statusCtx.globalAlpha = 1;
			}



			if(canBoostCpt>0 && ball.elt != NO_ELEMENT){
				style(statusCtx, "#fff");
				width = (width-2)*(canBoostCpt/CAN_BOOST_DURATION) >> 0;
				x = (screenWidth-width)/2+1;
				fillRect(statusCtx,x,y,width,height);

				//and wings
				style(statusCtx,0,TILE_LINE_COLOR_2,2);
				statusCtx.save();
				statusCtx.translate(screenWidth/2,y+10);
				statusCtx.rotate(-PI/2);
				statusCtx.beginPath();
				statusCtx.arc(-10,0,18,-0,-1.4,true);
				statusCtx.lineTo(0,0);
				statusCtx.closePath();
				statusCtx.stroke();

				statusCtx.beginPath();
				statusCtx.arc(-10,0,18,0,1.4);
				statusCtx.lineTo(0,0);
				statusCtx.closePath();
				statusCtx.stroke();

				statusCtx.restore();
			}
		}

		//Draw ring count
		style(statusCtx,0,"#cc0",3);
		drawCircle(statusCtx,screenWidth-20,STATUS_HEIGHT/2, 8, false,true);

		//Write time
		var time = (Date.now()-startTime)/1000 >> 0;
		var min = (time/60 >> 0);
		var s = time%60;
		if(s<10) s="0"+s;
		time = min+":"+s;
		style(statusCtx,"#fff");
		statusCtx.font = "18px sans-serif";
		statusCtx.textAlign="left";
		statusCtx.textBaseline="middle";
		statusCtx.fillText(time, 10,STATUS_HEIGHT/2);

		var txt;
		if(!started || gameIsOver){
			statusCtx.textAlign="center";
			txt = gameIsOver ? "Game over" :
					  restartCpt ? "Out..." :
					  startCpt <50 ? "Hold right mouse button" : "Release to launch !";
			statusCtx.fillText(txt, screenWidth/2,STATUS_HEIGHT/2);
		}

		//Write ring count
		var numRings = (rings.length-rings.n);
		var ringText = numRings+ " / " +rings.length;
		if(ringCpt>0){
			ringCpt--;
			if(ringStatus>0){
				style(statusCtx,"#0f0");
				ringText = toChar(0x2191)+" "+ringText;
			}else{
				style(statusCtx,"#f00");
				ringText = toChar(0x2193)+" "+ringText;
			}
		}
		statusCtx.textAlign="right";
		statusCtx.fillText( ringText, screenWidth-38,STATUS_HEIGHT/2);

		if(lostLifeCpt>0){
			lostLifeCpt--;
		}


		if(gameIsOver){
			//Draw score
			var win = lives > 0;
			var texts = [];
			var nTexts =0;
			var finishedScore = 10000;
			var ringScore = 100;
			var enemyScore = 200;
			var extraBallScore = 1000;
			var total = 0;

			if(win){
				texts[nTexts++] = {
					t:"YOU WIN :)",
					s: 32,
					c: "#0f4"
				};
			}else{
				texts[nTexts++] = {
					t:"YOU LOSE :(",
					s: 32,
					c: "#f04"
				};
			}

			texts[nTexts++] = {	s: 24 };

			if(win){
				total += finishedScore;
				texts[nTexts++] = {
					t1: "Finished game:",
					t2: finishedScore,
					s: 18,
					c: "#ccc"
				};

				total += extraBallScore*lives;
				texts[nTexts++] = {
					t1: "Extra balls:",
					t2: lives+" x "+extraBallScore,
					s: 18,
					c: "#ccc"
				};
			}else{
				total += ringScore*numRings;
				texts[nTexts++] = {
					t1: "Rings:",
					t2: numRings+" x "+ringScore,
					s: 18,
					c: "#ccc"
				};
			}

			total += monsterEaten*enemyScore;
			texts[nTexts++] = {
				t1: "Eaten monsters:",
				t2: monsterEaten+" x "+enemyScore,
				s: 18,
				c: "#ccc"
			};

			time = (Date.now()-startTime)/1000 >> 0;
			time = (300 - time)*20*numRings/rings.length >> 0; //Arbritrary value, 5 minutes = 0 bonus
			if(time<0) time = 0;
			total += time;
			texts[nTexts++] = {
				t1: "Time bonus:",
				t2: time,
				s: 18,
				c: "#ccc"
			};

			texts[nTexts++] = {
				t1: "Score:",
				t2: total,
				s: 24,
				c: "#fff"
			};
			if(localStorage){
				var max = parseInt(localStorage.getItem("pacBallScoreMax"));
				if(!max || max<total){
					localStorage.setItem("pacBallScoreMax",total);
				}
				if(max){
					if(max<total){
						texts[nTexts++] = {	s: 24 };
						texts[nTexts++] = {
							t: "New Record !",
							s: 24,
							c: "#fff"
						};
					}else{
						texts[nTexts++] = {
							t1: "( Record:",
							t2: max+" )",
							s: 18,
							c: "#ccc"
						};
					}
				}
			}


			texts[nTexts++] = {	s: 48 };

			texts[nTexts++] = {
				t: "Press SPACE to restart",
				s: 24,
				c: "#fff"
			};
			texts[nTexts++] = {	s: 48 };


			//compute text height
			margin = 10;
			size = 2*margin;
			for(i=0 ; i<nTexts ; i++){
				size += texts[i].s + 4;
			}

			texts.c = "#fff";


			var w = TABLE_WIDTH/2 -10;
			var h = size;
			renderCtx.save();
			renderCtx.translate( (screenWidth-w)/2 >> 0, (screenHeight-h)/2 >> 0);

			//Draw frame
			style(renderCtx,"#000","#fff");
			renderCtx.fillRect(0,0,w,h);
			renderCtx.strokeRect(0,0,w,h);

			//Draw texts
			renderCtx.textBaseline="top";
			for(i=0 ; i<nTexts ; i++){
				txt = texts[i];
				renderCtx.font = txt.s+"px sans-serif";
				renderCtx.fillStyle = txt.c;
				if(txt.t){
					renderCtx.textAlign= "center";
					renderCtx.fillText( txt.t, w/2,margin);
				}else if(txt.t1){
					renderCtx.textAlign= "right";
					renderCtx.fillText( txt.t1, w/2-4,margin);
					renderCtx.textAlign= "left";
					renderCtx.fillText( txt.t2, w/2+4,margin);
				}

				renderCtx.translate(0, txt.s+margin);
			}

			renderCtx.restore();
		}
	}

	function tic(){

		if(stb) stb(); // Stats plugin for debug

		//lives=1;
		if(gameIsOver){
			if(keys.space){
				gameIsOver = false;
				init();
				keys.space = false;
			}
		}else{
			processInput();
			update();
			checkGame();
			updateCamera();
			render();
			renderStatus();
		}

		if(ste) ste();

		requestAnimationFrame(tic);
	}
	init();
	tic();

	//------------------------------------------------------------------------------------------------------------------
	// entity functions
	//------------------------------------------------------------------------------------------------------------------

	//builds all objects that are are never added/removed during game
	function buildObjects(){

		//Create ball
		ball = addEntity( makeCircle(HALF_SIZE, TOTAL_SIZE-50, BALL_RADIUS, BALL));
		ball.v = {x: 0 , y:0};
		ball.cpt = 0;
		ball.elt = NO_ELEMENT;
		ball.sa = -PI/2;

		//side slopes
		addMultipleAndMirror( makeLine(0,220,150,100,OBSTACLE));

		//moving bumpers
		movingBumpers = [];
		var n = 4;
		var bumper;
		var i,j;
		for(i=0 ; i<n ; i++){
			var r = MONSTER_RADIUS-4;
			var dist = 2*r+(BUMPER_ZONE_RADIUS-2*r)*i/n;
			var angle = rand()*2*PI;
			bumper = makeCircle(0,0,r,BUMPER); //position is computed in updatePhysics
			movingBumpers.push(addEntity(bumper));
			//move speed, in pixels per frame
			var speed = (0.2+rand()*0.2)*(rand()>0.5 ? -1:1);
			//da = angular speed in radian per frame.
			bumper.da = speed/dist;
			bumper.a = angle;
			bumper.d = dist;
		}
		for(i=1 ; i<n ; i++){
			//Add mirror bumpers on edges
			for(j=0 ; j<i ; j++){
				bumper = cloneObject(movingBumpers[i]);
				bumper.a += 2*PI*(j+1)/(i+1);
				movingBumpers.push(addEntity(bumper));
			}
		}

		//addMultiple( makeCircle(600,400,30,BUMPER));
		//addMultiple( makeCircle(300,600,30,BUMPER));

		//Paddles
		addMultipleAndMirror( makeLine(150,100,300,30,PADDLE));
		pads = entities.slice(-8);
		var pad = pads[0];
		var padLength = pyth(pad.x-pad.x2, pad.y-pad.y2);
		var padSpreadAngle = -Math.acos( (pad.x2-pad.x)/padLength)*2; //angle between default position and max position
		for(i=0;i<pads.length;i++){
			pad = pads[i];
			pad.l = padLength;
			pad.ux = pad.x2-pad.x;
			pad.uy = pad.y2-pad.y;
			pad.amax = padSpreadAngle;
			if(pad.elt==1 || pad.elt==2) pad.amax*=-1;
		}
		//DEBUG single PAD
		//pads = [pads[1]];
		//entities = entities.slice(0,-8).concat(pads);
		//console.log(pads);


		//add rings
		rings = [];
		rings.n = 0;
		rings.cpt = 0;
		var ring, ringAngle;
		var nCircles = 6;
		var nBranches = 11;
		var startAngle = Math.random()*PI;
		for(i=1 ; i<=nCircles ; i++){
			for(j=1 ; j<=nBranches ; j++){
				ringAngle = 2*PI*(j/nBranches) + i*0.1 + startAngle;
				ring = makeEntity(CIRCLE,RING);
				ring.r = RING_RADIUS;
				rings[rings.n] = ring;
				rings.n++;

				ring.x = HALF_SIZE+Math.cos(ringAngle)*i*RING_ZONE_RADIUS/nCircles;
				ring.y = HALF_SIZE+Math.sin(ringAngle)*i*RING_ZONE_RADIUS/nCircles;
			}
		}


		//Add monsters
		for(i=0 ; i<4 ; i++){
			var monster = makeEntity(CIRCLE,MONSTER);
			monsters.push(monster);
			monster.elt = i;
			monster.r = MONSTER_RADIUS;

			//Define starting point: far from opposite element
			if(i===0 || i==1){
				monster.sy = TABLE_HEIGHT;
			}else{
				monster.sy = TOTAL_SIZE-TABLE_HEIGHT;
			}
			if(i===0 || i==3){
				monster.sx = TABLE_HEIGHT;
			}else{
				monster.sx = TOTAL_SIZE-TABLE_HEIGHT;
			}
			//define "home" position
			monster.hx = HALF_SIZE + 0.5*TABLE_WIDTH*(i==1 ? 1 : i==3 ? -1 : 0);
			monster.hy = HALF_SIZE + 0.5*TABLE_WIDTH*(i===0 ? 1 : i==2 ? -1 : 0);

			spawnMonster(monster);
		}
	}

	function spawnMonster(monster){
		monster.tx = monster.hx;
		monster.ty = monster.hy;
		monster.x = monster.sx;
		monster.y = monster.sy;
		monster.cpt = 0;
		monster.dead = false;

		monster.da = 0;
		monster.a = 0;
		monster.d = 1;
	}

	function makeEntity(shape,kind, x, y){
		return {
			x: x || 0, y: y || 0, shape:shape , kind:kind };
	}
	function addEntity(e){
		entities.push(e);
		return e;
	}

	function makeCircle(x,y,r,kind){
		var c = makeEntity(CIRCLE,kind,x,y);
		c.r = r;
		return c;
	}

	function makeLine(x,y,x2,y2,kind){
		var l = makeEntity(LINE,kind,x,y);
		l.x2 = x2;
		l.y2 = y2;
		return l;
	}

	//Add an entity, duplicating it on the 4 sides
	function addMultiple(entity){
		for(var j=0 ; j<4 ; j++){
			var clone = cloneObject(entity);
			convert(clone,"x","y",j);
			if(clone.shape==LINE){
				convert(clone,"x2","y2",j);
			}
			addEntity(clone);
			clone.elt = j;
		}
	}
	function addMultipleAndMirror(entity){
		addMultiple(entity);

		//create mirror entity
		entity.x = TABLE_WIDTH-entity.x;
		if(entity.shape==LINE){
			entity.x2 = TABLE_WIDTH-entity.x2;
		}
		entity.mirror = true;
		//and multiply it
		addMultiple(entity);
	}

	//tries to be clever converting positions from one table to the other
	function convert(e,xProp,yProp,side){
		var x = e[xProp];
		var y = e[yProp];
		if(side===0 || side==2){
			x += TABLE_HEIGHT+CORNER_RADIUS;
			if(side===0){
				y = TOTAL_SIZE-y;
			}
		}else{
			var swap = y;
			y = TABLE_HEIGHT+CORNER_RADIUS+x;
			x = swap;
			if(side==1){
				x = TOTAL_SIZE-x;
			}
		}
		e[xProp] = x;
		e[yProp] = y;
	}

	function cloneObject(o){
		return JSON.parse(JSON.stringify(o));
	}
	//------------------------------------------------------------------------------------------------------------------
	// geometry helper functions
	//------------------------------------------------------------------------------------------------------------------

	function identity(val){ return val; }
	function mirror(val){ return TOTAL_SIZE-val;	}

	function clamp(val,b1,b2){
		if(val<b1){
			return b1;
		}else if(val>b2){
			return b2;
		}
		return val;
	}

	function pyth(l1,l2){
		return sqrt(l1*l1 + l2*l2);
	}

	function normalize(p,size){
		size = (size || 1)/pyth(p.x, p.y);
		p.x *= size;
		p.y *= size;
	}

	function collideCircle(e1,e2){
		var dx = e1.x-e2.x;
		var dy = e1.y-e2.y;
		var dr = e1.r + e2.r;
		return dx*dx + dy*dy < dr*dr;
	}

	//http://jsperf.com/circle-line-collisions
	function collideLine(c,l,vector) {
		var circleX = c.x,
			circleY = c.y,
			radius = c.r,
			lineX1 = l.x,
			lineY1 = l.y,
			lineX2 = l.x2,
			lineY2 = l.y2;

		//modified from: http://stackoverflow.com/questions/1073336/circle-line-collision-detection
		var dlineX2lineX1 = (lineX2-lineX1);
		var dlineY2lineY1 = (lineY2-lineY1);
		var LAB = Math.sqrt( dlineX2lineX1*dlineX2lineX1+dlineY2lineY1*dlineY2lineY1 );
		var Dx = (lineX2-lineX1)/LAB;
		var Dy = (lineY2-lineY1)/LAB;
		var t = Dx*(circleX-lineX1) + Dy*(circleY-lineY1);
		var Ex = t*Dx+lineX1;
		var Ey = t*Dy+lineY1;

		//check to see if Ex is on the line
		if ((lineX2>lineX1 && Ex>=lineX1 && Ex<=lineX2) || (lineX2<lineX1 && Ex>=lineX2 && Ex<=lineX1) || (lineX1==lineX2 && Ex==lineX1) ) {
			if ((lineY2>lineY1 && Ey>=lineY1 && Ey<=lineY2) || (lineY2<lineY1 && Ey>=lineY2 && Ey<=lineY1) || (lineY1==lineY2 && Ey==lineY1) ) {
				var dEycircleY = (Ey-circleY);
				var dExcirclex = (Ex-circleX);
				var LEC = sqrt( dExcirclex*dExcirclex+dEycircleY*dEycircleY );
				if( LEC <= radius ) {
					vector.ex = Ex;
					vector.ey = Ey;
					vector.x = -dExcirclex;
					vector.y = -dEycircleY;
					vector.l = LEC;
					return true;
				}
			}
		}
		return false;
	}

	function computeLineEq(eq,x,y,x2,y2){
		if(x == x2){
			eq.vert = true;
			eq.x = x;
		}else{
			eq.vert = false;
			eq.m = (y-y2)/(x-x2);
			eq.p = y - eq.m * x;
		}
	}
	function checkAboveLineEq(eq,x,y,reverse){
		if(eq.vert){
			return x<eq.x;
		}else{
			if(!reverse){
				return y > eq.m*x+eq.p;
			}else{
				//instead of checking with x, we check with y
				//y=mx+p => x = (y-p)/m
				return x > (y-eq.p)/eq.m;
			}
		}
	}


	//------------------------------------------------------------------------------------------------------------------
	// canvas helper functions
	//------------------------------------------------------------------------------------------------------------------

	function makeCanvas(width, height){
		var canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		return canvas;
	}

	function getContext(canvas){
		return canvas.getContext("2d");
	}

	//set values to 0 if you don't want to change them, null if you want to reset them
	function style(ctx, fill,stroke,lineWidth){
		if(fill) ctx.fillStyle = fill;
		if(stroke) ctx.strokeStyle = stroke;
		if(lineWidth) ctx.lineWidth = lineWidth;
	}

	// c: color string or canvas/image
	function fillRect(ctx,x,y,w,h,c){
		if(c){
			if(c.width){
				c = ctx.createPattern(c, 'repeat');
			}
			style(ctx,c);
		}
		ctx.fillRect(x,y,w,h);
	}

	function drawImage(ctx,src,x,y){
		ctx.drawImage(src,x,y);
	}

	function drawCircle(ctx,x,y,radius,fill,stroke){
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, 2 * PI, false);
		if(fill){
			ctx.fill();
		}
		if(stroke){
			ctx.stroke();
		}
	}

	function drawLine(ctx,x,y,x2,y2){
		ctx.beginPath();
		ctx.moveTo(x,y);
		ctx.lineTo(x2,y2);
		ctx.stroke();
	}

	function clearCanvas(ctx){
		ctx.clearRect(0,0,screenWidth,screenHeight);
	}

	function drawCamembert(ctx, x,y,r,angle,dAngle, fill, stroke){
		ctx.beginPath();
		ctx.arc(x,y,r, angle+dAngle, angle-dAngle);
		ctx.lineTo(x,y);
		ctx.closePath();
		if(fill) ctx.fill();
		if(stroke) ctx.stroke();
	}

	//-----------------------------------------------------------
	// Input
	//-----------------------------------------------------------


	var keyMap = {
		37: "left", // left arrow
		65: "left", // a
		81: "left", // q
		38: "up",   // up arrow
		90: "up",	// z
		87: "up",	// w
		83: "down",	// d
		40: "down",
		39: "right",// right arrow
		68: "right",//d
		32: "space",
		27: "esc",
		13: "Enter"
	};
	//Set up key listener
	function onkey(isDown, e) {
		if (!e) e = window.e;
		var c = e.keyCode;
		if (e.charCode && !c) c = e.charCode;

		keys[keyMap[c]] = isDown;
	}
	document.onkeyup = function(e){
		onkey(false, e);

		//Debug
		if(e.keyCode==27){
			if(!window._stopped){
				window._stopped = true;
				window._raf = window.requestAnimationFrame;
				window.requestAnimationFrame = function(){};
			}else{
				window._stopped = false;
				window.requestAnimationFrame = window._raf;
			}
		}
		if(e.keyCode==13 && window._stopped) tic();
	};
	document.onkeydown = function(e){
		onkey(true, e);
	};

	function onmouse(isDown,e){
		var rightClick;
		var middleClick;
		if ("which" in e){ // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
			rightClick = e.which == 3;
			middleClick = e.which == 2;
		}else if ("button" in e){  // IE, Opera
			rightClick = e.button == 2;
			middleClick = e.button == 1;
		}
		if(rightClick){
			mouse.right = isDown;
		}else if(middleClick){
			mouse.middle = isDown;
		}else{
			mouse.left = isDown;
		}
		document.onmousemove(e);
	}
	document.onmousedown = function(e){
		onmouse(true,e);
	};
	document.onmouseup = function(e){
		onmouse(false,e);
	};
	document.onmousemove = function(e){
		mouse.x = e.clientX + cameraX;
		mouse.y = e.clientY + cameraY - STATUS_HEIGHT;
	};

	document.oncontextmenu = function(e){
		return false;
	};
};;(function() {
    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame =
            window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());;
var stb;
var ste;

(function(){
	var loadInterval = setInterval( function () {
		if (document.readyState === "complete") {
			var stats = new Stats();

			var t;
			stb = function(){
				stats.begin();
				t = Date.now();
			};
			ste = function(){
				t = Date.now()-t;
				if(t>10){
					//debug break here
					console.log("FRAAAAAAME",t);
				}
				stats.end();
			};
			stats.setMode(1); // 0: fps, 1: ms

			// Align top-left
			stats.domElement.style.position = 'absolute';
			stats.domElement.style.bottom = '0px';
			stats.domElement.style.right = '0px';

			document.body.appendChild( stats.domElement );

			clearInterval(loadInterval);
		}
	}, 200 );
})();;/**
 * @author mrdoob / http://mrdoob.com/
 */

var Stats = function () {
	var startTime = Date.now(), prevTime = startTime;
	var ms = 0, msMin = Infinity, msMax = 0;
	var fps = 0, fpsMin = Infinity, fpsMax = 0;
	var frames = 0, mode = 0;

	var container = document.createElement( 'div' );
	container.id = 'stats';
	container.addEventListener( 'mousedown', function ( event ) { event.preventDefault(); setMode( ++ mode % 2 ) }, false );
	container.style.cssText = 'width:80px;opacity:0.9;cursor:pointer';

	var fpsDiv = document.createElement( 'div' );
	fpsDiv.id = 'fps';
	fpsDiv.style.cssText = 'padding:0 0 3px 3px;text-align:left;background-color:#002';
	container.appendChild( fpsDiv );

	var fpsText = document.createElement( 'div' );
	fpsText.id = 'fpsText';
	fpsText.style.cssText = 'color:#0ff;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px';
	fpsText.innerHTML = 'FPS';
	fpsDiv.appendChild( fpsText );

	var fpsGraph = document.createElement( 'div' );
	fpsGraph.id = 'fpsGraph';
	fpsGraph.style.cssText = 'position:relative;width:74px;height:30px;background-color:#0ff';
	fpsDiv.appendChild( fpsGraph );

	while ( fpsGraph.children.length < 74 ) {

		var bar = document.createElement( 'span' );
		bar.style.cssText = 'width:1px;height:30px;float:left;background-color:#113';
		fpsGraph.appendChild( bar );

	}

	var msDiv = document.createElement( 'div' );
	msDiv.id = 'ms';
	msDiv.style.cssText = 'padding:0 0 3px 3px;text-align:left;background-color:#020;display:none';
	container.appendChild( msDiv );

	var msText = document.createElement( 'div' );
	msText.id = 'msText';
	msText.style.cssText = 'color:#0f0;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px';
	msText.innerHTML = 'MS';
	msDiv.appendChild( msText );

	var msGraph = document.createElement( 'div' );
	msGraph.id = 'msGraph';
	msGraph.style.cssText = 'position:relative;width:74px;height:30px;background-color:#0f0';
	msDiv.appendChild( msGraph );

	while ( msGraph.children.length < 74 ) {

		var bar = document.createElement( 'span' );
		bar.style.cssText = 'width:1px;height:30px;float:left;background-color:#131';
		msGraph.appendChild( bar );

	}

	var setMode = function ( value ) {

		mode = value;

		switch ( mode ) {

			case 0:
				fpsDiv.style.display = 'block';
				msDiv.style.display = 'none';
				break;
			case 1:
				fpsDiv.style.display = 'none';
				msDiv.style.display = 'block';
				break;
		}

	};

	var updateGraph = function ( dom, value ) {

		var child = dom.appendChild( dom.firstChild );
		child.style.height = value + 'px';

	};

	return {

		REVISION: 12,

		domElement: container,

		setMode: setMode,

		begin: function () {

			startTime = Date.now();

		},

		end: function () {

			var time = Date.now();

			ms = time - startTime;
			msMin = Math.min( msMin, ms );
			msMax = Math.max( msMax, ms );

			msText.textContent = ms + ' MS (' + msMin + '-' + msMax + ')';
			updateGraph( msGraph, Math.min( 30, 30 - ( ms / 200 ) * 30 ) );

			frames ++;

			if ( time > prevTime + 1000 ) {

				fps = Math.round( ( frames * 1000 ) / ( time - prevTime ) );
				fpsMin = Math.min( fpsMin, fps );
				fpsMax = Math.max( fpsMax, fps );

				fpsText.textContent = fps + ' FPS (' + fpsMin + '-' + fpsMax + ')';
				updateGraph( fpsGraph, Math.min( 30, 30 - ( fps / 100 ) * 30 ) );

				prevTime = time;
				frames = 0;

			}

			return time;

		},

		update: function () {

			startTime = this.end();

		}

	}

};

if ( typeof module === 'object' ) {
	module.exports = Stats;
}