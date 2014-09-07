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

	//------------------------------------------------------------------------------------------------------------------
	// sizes and DOM
	//------------------------------------------------------------------------------------------------------------------

	var tableWidth = 700;
	var tableHeight = 220;
	var cornerRadius = 200;
	var centerRadius = cornerRadius + tableWidth/2;
	centerRadius = pyth(centerRadius,centerRadius) - cornerRadius >> 0;
	var screenWidth;
	var screenHeight;
	var screenMinSize;

	var totalSize = tableWidth + 2*tableHeight + 2*cornerRadius;
	var halfSize = totalSize/2;
	var tileSize = 20;

	var bgCanvas = makeCanvas(totalSize, totalSize);
	var bgCtx = getContext(bgCanvas);

	var renderCanvas = makeCanvas();
	var renderCtx = getContext(renderCanvas);

	var fxCanvas = makeCanvas();
	var fxCtx = getContext(fxCanvas);

	var entityCanvas = makeCanvas();
	var entityCtx = getContext(entityCanvas);

	var spriteMargin = 4;
	var spriteSize = 40;
	var monsterRadius = spriteSize-2;

	var monsterCanvas = makeCanvas(4*(spriteSize+2*spriteMargin),spriteSize+2*spriteMargin);
	var monsterCtx = getContext(monsterCanvas);

	var cameraX;
	var cameraY;
	var prevCameraX;
	var prevCameraY;

	window.onresize = function(){
		screenWidth = clamp(win.innerWidth,tableWidth,totalSize);
		screenHeight = clamp(win.innerHeight,tableWidth,totalSize);
		screenMinSize = Math.min(screenWidth,screenHeight);
		entityCanvas.width = fxCanvas.width = renderCanvas.width = screenWidth = screenWidth-screenWidth%2;
		entityCanvas.height = fxCanvas.height = renderCanvas.height = screenHeight = screenHeight-screenHeight%2;
	};
	body.onresize();

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
	var COLLIDE_COLOR = "#0d0";

	var ELT_COLORS = [
		//WATER
		["#aef","#5af"],
		//FIRE
		["#fa0","#f53"],
		//EARTH
		["#a64","#864"],
		//AIR
		["rgba(255,255,255,0.5","#fff"],
		//NO ELEMENT
		["#ff6","#555"]
	];

	function buildBackground(){
		var tempCanvas = makeCanvas(tileSize, tileSize);
		var tempCtx = getContext(tempCanvas);

		//checkboard pattern
		fillRect(tempCtx,0,0,tileSize,tileSize,TILE_LINE_COLOR); //"#fff");
		fillRect(tempCtx,0,0,tileSize-1,tileSize-1,TILE_LINE_COLOR_2); //"#eee");
		fillRect(tempCtx,0,0,tileSize-2,tileSize-2,TILE_FILL_COLOR); //"#f8f8f8");
		fillRect(bgCtx,0,0,totalSize,totalSize, tempCanvas);

		//element overlay
		bgCtx.globalAlpha = 0.1;
		fillRect(bgCtx,0,totalSize-tableHeight-2,totalSize,tableHeight,ELT_COLORS[WATER][1]);//WATER
		fillRect(bgCtx,totalSize-tableHeight-2,0,tableHeight,totalSize,ELT_COLORS[FIRE][1]);//FIRE
		fillRect(bgCtx,0,0,totalSize,tableHeight,ELT_COLORS[EARTH][1]);//EARTH
		fillRect(bgCtx,0,0,tableHeight,totalSize,ELT_COLORS[AIR][1]);//AIR
		bgCtx.globalAlpha = 1;
		bgCtx.globalCompositeOperation = "source-over";

		//diagonal lines
		drawLine(bgCtx,0,0,totalSize,totalSize,TILE_LINE_COLOR_3);
		drawLine(bgCtx,totalSize,0,0,totalSize,TILE_LINE_COLOR_3);

		//middle circle
		drawCircle(bgCtx,halfSize,halfSize,8,TILE_FILL_COLOR,TILE_LINE_COLOR_3);
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
			bgCtx.lineTo( x(tableHeight+cornerRadius), y(-m) );
			bgCtx.lineTo( x(tableHeight+cornerRadius), y(tableHeight) );
			bgCtx.arcTo ( x(tableHeight+cornerRadius), y(tableHeight+cornerRadius),
				x(tableHeight), y(tableHeight+cornerRadius), cornerRadius);
			bgCtx.lineTo( x(-m), y(tableHeight+cornerRadius) );
			bgCtx.closePath();
			bgCtx.fill();
			bgCtx.stroke();

			//add wall entities
			addEntity( makeCircle( x(tableHeight), y(tableHeight), cornerRadius,BACKGROUND) );
			addEntity( makeLine( x(0), y(tableHeight+cornerRadius), x(tableHeight), y(tableHeight+cornerRadius), BACKGROUND ) );
			addEntity( makeLine( x(tableHeight+cornerRadius), y(0), x(tableHeight+cornerRadius), y(tableHeight), BACKGROUND ) );

			//draw arrows
			var char_ = x==identity ? leftChar : rightChar;
			bgCtx.font = "64px sans-serif";
			bgCtx.textAlign="center";
			bgCtx.textBaseline="middle";
			style(bgCtx,ELT_COLORS[t1][1]);
			bgCtx.fillText(toChar(char_),x(tableHeight+cornerRadius+130)-2,y(50)-3);
			style(bgCtx,ELT_COLORS[t2][1]);
			char_ = y==identity ? upChar : downChar;
			bgCtx.fillText(toChar(char_),x(50)-2,y(tableHeight+cornerRadius+130)-3);

			//draw element text
			bgCtx.font = "16px sans-serif";
			bgCtx.textAlign="center";
			bgCtx.textBaseline="middle";
			style(bgCtx,ELT_COLORS[t1][1]);
			bgCtx.fillText(ELEMENT_TEXTS[t1],x(tableHeight+cornerRadius+30),y(12));
			style(bgCtx,ELT_COLORS[t2][1]);
			bgCtx.fillText(ELEMENT_TEXTS[t2],x(16),y(tableHeight+cornerRadius+12));
		}
		buildSide(identity,identity,2,3);
		buildSide(identity,mirror,0,3);
		buildSide(mirror,identity,2,1);
		buildSide(mirror,mirror,0,1);


		//Also draw monster skins
		var s = spriteSize;
		var s2 = s/2;
		var r = spriteMargin;

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
		drawLine(monsterCtx,8,4,4,20,"#fff",2);
		drawLine(monsterCtx,16,2,8,26, 0,1);
		drawLine(monsterCtx,36,14,18,36, 0,1);
		drawLine(monsterCtx,38,18,26,36, 0,2);
		//eyes
		drawLine(monsterCtx,s2-4,10,s2-4,18,"#58f",2);
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
		drawCircle(monsterCtx,10,7,1,"#d72");
		drawCircle(monsterCtx,24,9,1);
		drawCircle(monsterCtx,7,20,1);
		drawCircle(monsterCtx,20,14,1);
		drawCircle(monsterCtx,8,30,1);
		drawCircle(monsterCtx,28,32,1);
		//eyes
		for(var i=0;i<2;i++){
			var fill;
			if(i===0){
				monsterCtx.globalCompositeOperation = "destination-out";
				fill = "#000";
			}else{
				monsterCtx.globalCompositeOperation = "source-over";
				fill = null;
			}
			monsterCtx.scale(1, 3/2);
			drawCircle(monsterCtx,13,14,4,fill,"#d72",1);
			monsterCtx.scale(1, 2/3);
			//monsterCtx.stroke();
			monsterCtx.scale(1, 3/2);
			drawCircle(monsterCtx,26,14,4,fill,"#d72",1);
			monsterCtx.scale(1, 2/3);
			//monsterCtx.stroke();
		}

		//GLASS
		monsterCtx.translate(s+8, 0);

		monsterCtx.lineCap = "round";
		//Sphere support (looks weird)
		/*
		style(monsterCtx,0,"red",4);
		monsterCtx.beginPath();
		monsterCtx.arc(s2, s2-2, s2, 0.6, 2.54);
		monsterCtx.stroke();
		monsterCtx.beginPath();
		monsterCtx.arc(s2, s2-10, s2+5, 1, 2.14);
		monsterCtx.stroke();
		*/
		//sphere
		drawCircle(monsterCtx,s2,s2,s2-4,null,"#fff",2);
		//Reflection
		style(0,0,1);
		monsterCtx.beginPath();
		monsterCtx.arc(s2, s2, s2-8, 3.2, 4.4);
		monsterCtx.stroke();
		//eyes
		drawCircle(monsterCtx,s2-4,s2+4,4,0,"#fff",2);
		drawCircle(monsterCtx,s2+4,s2+4,4,0,"#fff",2);
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
		MONSTER = "m";

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


	//ball,walls,slopes,padles (everything that isn't added/removed)
	var entities;
	var monsters;
	var ball;
	var pads;
	var movingBumpers;

	var BALL_RADIUS = 14;

	//Start seq via right button
	var started = false;
	var START_CPT_MAX = 100;
	var startCpt = 0;
	var startPulse = 0;
	var startAngle = 0;

	//basic physics settings
	var MAX_SPEED = 10;
	var GRAVITY = 0.2;

	//boost settings (paddle and left click)
	var MIN_BOOST_CPT = 1;
	var BOOST_CPT_BONUS = 12;
	var MIN_BOOST_SPEED = 0.2*MAX_SPEED;
	var BOOST_SPEED_BONUS = 0.8*MAX_SPEED;

	var canBoost = false; //left click boost

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
		startCpt = 0;
		started = false;
		entities = [];
		monsters = [];
		monsters.n = 0;
		buildBackground();
		buildObjects();
	}

	function processInput(){
		//boost sequence
		if(!started){
			if(mouse.right || keys.space){
				if(startCpt<START_CPT_MAX){
					startCpt++;
				}
			}else{
				if(startCpt>0){
					var boostRatio = 0.1 + 0.9*startCpt / START_CPT_MAX;
					//Space boost: based on space held down duration + random x nudge
					var speed = MIN_BOOST_SPEED+BOOST_SPEED_BONUS*boostRatio;
					ball.boostX = speed*Math.cos(startAngle);
					ball.boostY = speed*Math.sin(startAngle);
					ball.boostCpt = MIN_BOOST_CPT+BOOST_CPT_BONUS*boostRatio;
					started = true;

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
			ball.boostCpt = 0;
			mouse.middle = false;
			//console.log("mouse teleport",ball);
		}

		//left click boost
		if(mouse.left && canBoost){
			tempVector.x = mouse.x-ball.x;
			tempVector.y = mouse.y-ball.y;
			normalize(tempVector, MIN_BOOST_SPEED+0.5*BOOST_SPEED_BONUS);
			ball.v.x = tempVector.x;
			ball.v.y = tempVector.y;

			ball.boostCpt = MIN_BOOST_CPT+0.5*BOOST_CPT_BONUS;
			ball.boostX = ball.v.x;
			ball.boostY = ball.v.y;

			canBoost = 0;
			mouse.left = false;
		}
	}

	function updatePhysics(){
		var i,len, e,eLen;

		//rotate moving bumpers
		len=movingBumpers.length;
		eLen = movingBumpers.length + monsters.n;
		for(i=0 ; i<eLen ; i++){
			if(i<len){
				e = movingBumpers[i];
			}else{
				e = monsters[i-len];
			}
			e.a += e.da;
			//moving bumper
			e.x = halfSize+Math.cos(e.a)* e.d;
			e.y = halfSize+Math.sin(e.a)* e.d;
		}

		//Update ball physics
		if(started){
			//Compute gravity
			var gx = 0;
			var gy = 0;
			var gravity = GRAVITY;
			var maxSpeed = MAX_SPEED;
			//distance to screen center
			dx = halfSize - ball.x;
			dy = halfSize - ball.y;
			var range = screenWidth/2;
			var distanceToCenter = pyth(dx,dy);
			if(distanceToCenter < range){
				//Reduce the gravity as we go towards the center
				//normalize
				dx/=distanceToCenter;
				dy/=distanceToCenter;
				gravity *= (0.1+0.9*distanceToCenter/range); //Close to the center, gravity gets weaker
				maxSpeed *= (0.5+0.5*distanceToCenter/range);
			}

			//applied gravity depends on which quadrant the ball is in
			var x = ball.x - halfSize,
				y = ball.y - halfSize;

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
			if(ball.boostCpt>0){
				ball.boostCpt--;
				ball.v.x += ball.boostX;
				ball.v.y += ball.boostY;
			}

			//make sure speed can't be too high
			if(ball.v.x*ball.v.x+ball.v.y*ball.v.y > maxSpeed*maxSpeed){
				normalize(ball.v,maxSpeed);
			}
			//update position based on speed
			ball.x += ball.v.x;
			ball.y += ball.v.y;


			//ball collisions (CAUTION: the following code is more about cuisine than physics)
			ball.collide = false;
			var prevVx = ball.v.x;
			var prevVy = ball.v.y;
			eLen = entities.length;
			len = eLen + monsters.n;
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
								if(killMap[ball.elt] == e.elt){
									//ball kills monster of opposite element
									e.dead = true;
									//ball.elt = NO_ELEMENT;
								}

								if(e.dead || e.elt==ball.elt){
									//no collision with same element or dead element
									continue;
								}else{
									if(e.elt != ball.elt){
										//ball loses power on incompatible elements
										ball.elt = NO_ELEMENT;
									}
								}
							}

							e.collide = true;
							//compute vector going from entity center to ball center
							collisionVector.x = ball.x- e.x;
							tempVector.y = ball.y- e.y;
							l = pyth(collisionVector.x,collisionVector.y);
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

										if(!ball.boostCpt){
											//initial boost
											console.log("=============");
											ball.boostCpt = boostCpt;
											ball.boostX = boostX;
											ball.boostY = boostY;
										}else{
											//add a part of previous boost (give big priority to initial impact)
											ball.boostCpt = boostCpt;
											ball.boostX = 0.2*boostX + ball.boostX;
											ball.boostY = 0.2*boostY + ball.boostY;
										}
										console.log("boostRatio",boostRatio,ball.boostCpt,"=>",ball.boostX,ball.boostY);

										//randomize a little to avoid trajectories too often the same
										ball.boostX *= (0.8+rand()*0.4);
										ball.boostY *= (0.8+rand()*0.4);

										ball.elt = e.elt;
										canBoost = true;
										continue;
									}
								}
							}
						}
					}
					if(e.collide){

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
							bounciness = 1.3;
							canBoost = true;
						}else if(e.kind==MONSTER){
							if(e.elt==ball.elt){
								bounciness = 1.5;
							}else{
								bounciness = 0.5;
							}
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

	function updateCamera(){
		prevCameraX = cameraX;
		prevCameraY = cameraY;

		//Objectives:
		// - limit camera movement as much as possible
		// - keep ball as close to center as possible
		// - avoid camera "jumps"

		//define camera center
		var x = ball.x;
		var y = ball.y;
		//change origin to screen center
		var ox = x-halfSize;
		var oy = y-halfSize;

		var absox = ox;
		var absoy = oy;
		if(absox<0) absox*=-1;
		if(absoy<0) absoy*=-1;

		var range = tableWidth/2 + cornerRadius;
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
				x = halfSize + x;
				y = halfSize + y;
			}//else outside the circle, means close enough to the center, no snapping
		}else{
			//Snap to closest line
			if(absox<absoy){
				x=halfSize;
			}else{
				y=halfSize;
			}
		}
		//make sure ball stays close to the center
		x = clamp(x, ball.x - screenWidth*0.3, ball.x + screenWidth *0.3);
		y = clamp(y, ball.y - screenHeight*0.3, ball.y + screenHeight *0.3);
		//stay within scene bounds
		x = clamp(x - screenWidth/2, 0, totalSize-screenWidth);
		y = clamp(y - screenHeight/2, 0, totalSize-screenHeight);

		if(started){
			//smooth transition to ideal position
			cameraX += (x-cameraX)*0.3;
			cameraY += (y-cameraY)*0.3;
		}else{
			cameraX = x;
			cameraY = y;
		}
	}


	function render(){
		var drawFx = started;
		clearCanvas(renderCtx);
		clearCanvas(entityCtx);

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

			if(ball.boostCpt>0){
				//Draw boost afterburner
				drawCircle(fxCtx,ball.prevX-cameraX,ball.prevY-cameraY,6, ELT_COLORS[ball.elt][1]);
			}else{
				drawCircle(fxCtx,ball.x-cameraX,ball.y-cameraY,2, ELT_COLORS[ball.elt][1]);
			}
		}else{
			clearCanvas(fxCtx);
		}


		//Draw ball position
		//drawCircle(bgCtx,ball.x,ball.y,10, ball.collide ? "red": ball.boostCpt > 0 ? "orange":"white");
		//Draw camera center position
		//drawCircle(bgCtx,cameraX+screenWidth/2,cameraY+screenHeight/2,1,TILE_LINE_COLOR_3);

		var dx,dy;
		for(var i=0 , len=entities.length ; i<len ; i++){
			var e = entities[i];
			var x = e.x-cameraX;
			var y = e.y-cameraY;
			var fill, stroke, lineWidth;
			if(e==ball){
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
					dAngle = 2+8*(startCpt/START_CPT_MAX) >>0 ;
					//mouth orientation changes with time
					angle += Math.cos(startPulse)*PI/3;
					startAngle = angle; //it defines the boost direction
				}
				dAngle *= 0.3*PI/10;

				//Shake when starting
				dx = 0;
				dy = 0;
				if(startCpt>0 && !started){
					var shake = clamp(startCpt/START_CPT_MAX,0,1)*4 >>0;
					dx = shake*rand() >> 0;
					dy = shake*rand() >> 0;
				}
				if(canBoost){
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
				stroke = ELT_COLORS[ball.elt][1];
				fill = ELT_COLORS[ball.elt][0];
				if(dAngle===0){
					drawCircle(entityCtx,
						ball.x-cameraX +dx,
						ball.y-cameraY +dy,
						BALL_RADIUS,fill,stroke);
				}else{
					style(entityCtx,fill,stroke,2);
					entityCtx.beginPath();
					entityCtx.arc(
						ball.x-cameraX +dx,
						ball.y-cameraY +dy,
						ball.r,	angle+dAngle, angle-dAngle);
					entityCtx.lineTo(
						ball.x-cameraX +dx,
						ball.y-cameraY +dy);
					entityCtx.closePath();
					entityCtx.fill();
					entityCtx.stroke();
				}



			}else if(e.shape == CIRCLE){
				//Bumper or monster
				if(e.kind==BACKGROUND){
					fill = 0;
					stroke = 0;
				}else{
					lineWidth = 2;
					stroke = WALL_COLOR;
					fill = "#000";
					if(e.colCpt>0){
						e.colCpt--;
						stroke = COLLIDE_COLOR;
					}
				}
				if(fill || stroke){
					drawCircle(entityCtx,x,y, e.r,fill,stroke, lineWidth);
				}
			}else if(e.shape == LINE){
				if(e.kind!=BACKGROUND){ //side walls are dawn in background
					stroke = WALL_COLOR;
					if(e.kind==PADDLE){
						stroke = ELT_COLORS[e.elt][1];
						/*
						if(e.collide){
							stroke = COLLIDE_COLOR;
						}
						*/
					}
					if(stroke){
						drawLine(entityCtx, e.x-cameraX, e.y-cameraY, e.x2-cameraX, e.y2-cameraY,stroke,2);
					}
				}

				/*
				 //drawCircle(renderCtx,e.x-cameraX, e.y-cameraY,4,"red");
				 if(e.kind==PADDLE){
				 drawLine(renderCtx, e.x-cameraX, e.y-cameraY, e.prevX2-cameraX, e.prevY2-cameraY,"yellow",2);
				 }
				 */
			}
		}

		//draw monsters
		for(i=0 ; i<monsters.n ; i++){
			var a = 1;
			var m = monsters[i];
			var size = (spriteSize+spriteMargin*2);

			var vulnerable = killMap[ball.elt] == m.elt;
			var same = ball.elt == m.elt;


			if(m.dead){
				//dead monster
				m.cpt-=10; //fade out faster than fade in
				if(m.cpt<=0){
					//remove dead monster (swap with the end of the list)
					a = monsters[monsters.n-1];
					monsters[i] = a;
					monsters[monsters.n-1] = m;
					monsters.n--;
					i--;
					continue;
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

			//Draw halo for elements that are collidable
			if(!same){
				entityCtx.globalAlpha = 0.2*a;
				drawCircle(entityCtx, m.x-cameraX, m.y-cameraY, m.r,ELT_COLORS[m.elt][0]);
				if(m.elt==AIR){
					entityCtx.globalAlpha = 1;
					entityCtx.globalCompositeOperation = "destination-out";
					drawCircle(entityCtx, m.x-cameraX, m.y-cameraY, 17,ELT_COLORS[m.elt][0]);
					entityCtx.globalCompositeOperation = "source-over";
				}
			}

			//Apply cpt fade for basic destroy/appear fade
			entityCtx.globalAlpha = a;

			if(!vulnerable && !same){
				//incompatible element have a border
				drawCircle(entityCtx, m.x-cameraX, m.y-cameraY, m.r,null,ELT_COLORS[m.elt][0]);
			}

			dx = 0;
			dy = 0;
			if(vulnerable){
				//Shake in fear !
				dx = 3*(Math.random()-0.5);
				dy = 3*(Math.random()-0.5);
			}

			if(!vulnerable){
				//non targetable element are faded out
				entityCtx.globalAlpha = a * 0.5;
			}

			entityCtx.drawImage(monsterCanvas,
				m.elt*size,0,size,size,
				m.x-size/2 - cameraX + dx, m.y-size/2 - cameraY + dy,size,size
			);

			//drawCircle(entityCtx, m.x-cameraX, m.y-cameraY, m.r,null,ELT_COLORS[m.elt][0]);
		}
		entityCtx.globalAlpha = 1;

		//compose final rendering
		drawImage(renderCtx, bgCanvas, -cameraX, -cameraY);
		if(drawFx) drawImage(renderCtx, fxCanvas, 0, 0);
		drawImage(renderCtx, entityCanvas, 0, 0);
	}

	function updateGameWorld(){
		//make sure we always have enough monsters
		var nMonsters = 4;
		while(monsters.n<nMonsters){
			var monster;
			if(monsters.length==monsters.n){
				monster = makeEntity(CIRCLE,MONSTER);
				monsters.push(monster);
				monster.elt = monsters.n%4;
				monster.r = monsterRadius;
			}else{
				monster = monsters[monsters.n];
			}
			monsters.n++;

			var bumper = movingBumpers[monsters.n%movingBumpers.length];
			monster.x = bumper.x;
			monster.y = bumper.y;
			monster.cpt = 0;
			monster.dead = 0;
			monster.da = -2*bumper.da;
			monster.a = bumper.a;
			monster.d = bumper.d;
		}

		//Detect ball out of screen ie player losing
		//bring back to the screen and prepare start sequence
		var stop = false;
		if(ball.x+BALL_RADIUS<0){
			stop = true;
			ball.x = 50;
			ball.y = halfSize;
			ball.sa = 0; //define starting angle
		}else if(ball.x-BALL_RADIUS>totalSize){
			stop = true;
			ball.x = totalSize-50;
			ball.y = halfSize;
			ball.sa = -PI;
		}else if(ball.y+BALL_RADIUS<0){
			stop = true;
			ball.y = 50;
			ball.x = halfSize;
			ball.sa = PI/2;
		}else if(ball.y-BALL_RADIUS>totalSize){
			stop = true;
			ball.y = totalSize-50;
			ball.x = halfSize;
			ball.sa = -PI/2;
		}
		if(stop){
			started = false;
			startCpt = 0;
			ball.elt = NO_ELEMENT;
			ball.v.x = 0;
			ball.v.y = 0;
		}
	}

	function tic(){

		if(stb) stb(); // Stats plugin for debug

		processInput();
		updatePhysics();
		updateCamera();
		render();
		updateGameWorld();

		if(ste) ste();

		window.requestAnimationFrame(tic);
	}
	init();
	tic();

	//------------------------------------------------------------------------------------------------------------------
	// entity functions
	//------------------------------------------------------------------------------------------------------------------

	//builds all objects that are are never added/removed during game
	function buildObjects(){

		//Create ball
		canBoost = false;
		ball = addEntity( makeCircle(halfSize, totalSize-50, BALL_RADIUS, BALL));
		ball.v = {x: 0 , y:0};
		ball.cpt = 0;
		ball.elt = NO_ELEMENT;
		ball.sa = -PI/2;

		//side slopes
		addMultipleAndMirror( makeLine(0,220,150,100,OBSTACLE));

		//moving bumpers
		movingBumpers = [];
		var n = 4;
		for(var i=0 ; i<n ; i++){
			var r = monsterRadius+4;
			var dist = 2*r+(centerRadius-2*r)*i/n >>0;
			var angle = rand()*2*PI;
			var bumper = makeCircle(0,0,r,BUMPER); //position is computed in updatePhysics
			movingBumpers.push(addEntity(bumper));
			//move speed, in pixels per frame
			var speed = (0.2+rand()*0.2)*(rand()>0.5 ? -1:1);
			//da = angular speed in radian per frame.
			bumper.da = speed/dist;
			bumper.a = angle;
			bumper.d = dist;

			if(i>1){
				//Add mirror bumpers on edges
				bumper = cloneObject(bumper);
				bumper.a += PI;
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
		entity.x = tableWidth-entity.x;
		if(entity.shape==LINE){
			entity.x2 = tableWidth-entity.x2;
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
			x += tableHeight+cornerRadius;
			if(side===0){
				y = totalSize-y;
			}
		}else{
			var swap = y;
			y = tableHeight+cornerRadius+x;
			x = swap;
			if(side==1){
				x = totalSize-x;
			}
		}
		e[xProp] = x>>0;
		e[yProp] = y>>0;
	}

	function cloneObject(o){
		return JSON.parse(JSON.stringify(o));
	}
	//------------------------------------------------------------------------------------------------------------------
	// geometry helper functions
	//------------------------------------------------------------------------------------------------------------------

	function identity(val){ return val; }
	function mirror(val){ return totalSize-val;	}

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
		if(fill!==0) ctx.fillStyle = fill;
		if(stroke!==0) ctx.strokeStyle = stroke;
		if(lineWidth!==0) ctx.lineWidth = lineWidth;
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

	function drawCircle(ctx,x,y,radius,fill,stroke,width){
		style(ctx,fill,stroke,width||2);
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, 2 * PI, false);
		if(fill){
			ctx.fill();
		}
		if(stroke){
			ctx.stroke();
		}
		ctx.closePath();
	}

	function drawLine(ctx,x,y,x2,y2,color,width){
		style(ctx,0,color,width||2);
		ctx.beginPath();
		ctx.moveTo(x,y);
		ctx.lineTo(x2,y2);
		ctx.stroke();
		//ctx.closePath();
	}

	function clearCanvas(ctx){
		ctx.clearRect(0,0,screenWidth,screenHeight);
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
		mouse.x = e.clientX + cameraX;
		mouse.y = e.clientY + cameraY;
	}
	document.onmousedown = function(e){
		onmouse(true,e);
	};
	document.onmouseup = function(e){
		onmouse(false,e);
	};
	document.onmousemove = function(e){
		mouse.x = e.clientX + cameraX;
		mouse.y = e.clientY + cameraY;
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
			stats.domElement.style.left = '0px';
			stats.domElement.style.top = '0px';

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