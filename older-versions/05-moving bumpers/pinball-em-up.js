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


	//used for entity.table
	//var BOTTOM = 0;
	//var RIGHT = 1;
	//var TOP = 2;
	//var LEFT = 3;

	var tableWidth = 700;
	var tableHeight = 200;
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

	var renderCanvas = makeCanvas(screenWidth,screenHeight);
	var renderCtx = getContext(renderCanvas);

	var fxCanvas = makeCanvas(screenWidth,screenHeight);
	var fxCtx = getContext(fxCanvas);

	var entityCanvas = makeCanvas(screenWidth,screenHeight);
	var entityCtx = getContext(entityCanvas);

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
	//debug
	//body.appendChild(tempCanvas);
	//body.appendChild(bgCanvas);

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
	var PADDLE_COLOR = "#dd0";

	var BALL_STROKE_COLOR = "#000";
	var BALL_FILL_COLOR = "#fff";
	var DEBUG_COLOR = "#0f0";

	var SHOT_COLOR = "#fa0";

	function buildBackground(){
		var tempCanvas = makeCanvas(tileSize, tileSize);
		var tempCtx = getContext(tempCanvas);

		//checkboard pattern
		fillRect(tempCtx,0,0,tileSize,tileSize,TILE_LINE_COLOR); //"#fff");
		fillRect(tempCtx,0,0,tileSize-1,tileSize-1,TILE_LINE_COLOR_2); //"#eee");
		fillRect(tempCtx,0,0,tileSize-2,tileSize-2,TILE_FILL_COLOR); //"#f8f8f8");
		fillRect(bgCtx,0,0,totalSize,totalSize, tempCanvas);

		//diagonal lines
		drawLine(bgCtx,0,0,totalSize,totalSize,TILE_LINE_COLOR_3);
		drawLine(bgCtx,totalSize,0,0,totalSize,TILE_LINE_COLOR_3);

		//middle circles
		drawCircle(bgCtx,halfSize,halfSize,8,TILE_FILL_COLOR,TILE_LINE_COLOR_3);
		//drawCircle(bgCtx,halfSize,halfSize,centerRadius,null,TILE_LINE_COLOR_3,1);

		var upChar = 0x21e7;
		var downChar = 0x21e9;
		var leftChar = 0x21e6;
		var rightChar = 0x21e8;

		bgCtx.font = "64px sans-serif";
		bgCtx.textAlign="center";
		bgCtx.textBaseline="middle";

		function buildWall(x,y){
			//draw
			var m = 4; //margin
			bgCtx.strokeStyle = WALL_COLOR;
			bgCtx.fillStyle = VOID_COLOR;
			bgCtx.lineWidth = 2;

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

			//add entities
			addEntity( makeCircle( x(tableHeight), y(tableHeight), cornerRadius,BACKGROUND) );
			addEntity( makeLine( x(0), y(tableHeight+cornerRadius), x(tableHeight), y(tableHeight+cornerRadius), BACKGROUND ) );
			addEntity( makeLine( x(tableHeight+cornerRadius), y(0), x(tableHeight+cornerRadius), y(tableHeight), BACKGROUND ) );

			bgCtx.fillStyle = PADDLE_COLOR;
			var char_ = x==identity ? leftChar : rightChar;
			bgCtx.fillText(toChar(char_),x(tableHeight+cornerRadius+130)-2,y(50)-3);
			char_ = y==identity ? upChar : downChar;
			bgCtx.fillText(toChar(char_),x(50)-2,y(tableHeight+cornerRadius+130)-3);
		}

		buildWall(identity,identity);
		buildWall(identity,mirror);
		buildWall(mirror,identity);
		buildWall(mirror,mirror);
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
		SHOT = "s";


	var entities;
	var shots;
	var ball;
	var pads;
	var movingBumbers;

	var maxSpeed = 15;
	var ballRadius = 14;
	var GRAVITY = 0.2;
	var FRICTION = 0.99;
	var SIDE_FRICTION = 0.94;

	var keys = {};
	var mouse = {};
	var started = false;
	var startCpt = 0;
	var startCptMax = 100;

	var tempLineEq = {};

	var tempVector = {}; //Temp var, return value for collision detection
	var tempVector2 = {};
	//------------------------------------------------------------------------------------------------------------------
	// main loop
	//------------------------------------------------------------------------------------------------------------------

	function init(){
		startCpt = 0;
		started = false;
		entities = [];
		shots = [];
		shots.n = 0;
		buildBackground();
		buildObjects();
	}

	function processInput(){

		//boost sequence
		if(!started){
			if(keys.space){
				startCpt++;
			}else{
				if(startCpt>0){
					var boost = startCpt / startCptMax;
					if(boost>1) boost = 1;
					//Space boost: based on space held down duration + random x nudge
					ball.boostX = 3*(1+rand());//*(rand()>0.5 ? -1 : 1);
					ball.boostY = -maxSpeed;
					ball.boostCpt = 10+boost*50;
					started = true;
				}
			}
			if(keys.R){
				started = true;
			}
		}

		//Paddles
		for(var i=0;i<pads.length;i++){
			var pad = pads[i];
			var left = !pad.mirror;
			var move;
			if(pad.table==1){
				move = !left ? keys.down || keys.left : keys.up || keys.right;
			}else{
				move = left ? keys.up || keys.left : keys.down || keys.right;
			}

			var dx = pad.ux; //Vector going from pad pivot to pad edge
			var dy = pad.uy;
			pad.cpt = pad.cpt || 0;
			var maxCpt = 7;
			pad.max = false;

			if(move){
				//console.log("pad moving!!!!!!!!!!!!!!!!!!!!!");
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

		if(mouse.middle){
			startCpt = 0;
			started = true;
			ball.x = mouse.x;
			ball.y = mouse.y;
			ball.a.x = ball.a.y = 0;
			ball.v.x = ball.v.y = 0;
			ball.boostCpt = 0;
			mouse.right = false;
			console.log("mouse teleport",ball);
		}


		if(mouse.right){
			tempVector.x = mouse.x-ball.x;
			tempVector.y = mouse.y-ball.y;
			normalize(tempVector);
			ball.boostCpt = 6;
			ball.boostX = tempVector.x *2.5;
			ball.boostY = tempVector.y *2.5;

			mouse.right = false;
		}


		if(mouse.left){
			tempVector.x = mouse.x-ball.x;
			tempVector.y = mouse.y-ball.y;
			normalize(tempVector);

			/*
			ball.a.x = tempVector.x*GRAVITY;
			ball.a.y = tempVector.y*GRAVITY;
			*/

			if(mouse.leftCpt%10===0){
				var shot;
				if(shots.length==shots.n){
					shot = makeEntity(LINE,SHOT);
					shots.push(shot);
				}else{
					shot = shots[shots.n];
				}
				shots.n++;

				var shotSpeed = 10;
				shot.x = ball.x + tempVector.x*(shotSpeed+ballRadius);
				shot.y = ball.y + tempVector.y*(shotSpeed+ballRadius);
				shot.v.x = tempVector.x*shotSpeed;
				shot.v.y = tempVector.y*shotSpeed;

				shot.cpt = 100;
			}
		}
		if(mouse.left){
			mouse.leftCpt++;
		}else{
			mouse.leftCpt=0;
		}
	}

	function updatePhysics(){
		var i,len,e;

		//rotate moving bumbers
		for(i=0,len=movingBumbers.length ; i<len ; i++){
			e = movingBumbers[i];
			e.a = (e.a+e.da*2*PI);
			//moving bumper
			e.x = halfSize+Math.cos(e.a)* e.d;
			e.y = halfSize+Math.sin(e.a)* e.d;
		}

		//Update ball physics
		if(started){
			if(ball.boostCpt>0){
				ball.boostCpt--;
				ball.a.x = ball.boostX;
				ball.a.y = ball.boostY;
			}
			var gx = 0;
			var gy = 0;

			var gravity = GRAVITY;
			//TEST: add attraction force to the screen center
			dx = halfSize - ball.x;
			dy = halfSize - ball.y;
			var range = screenWidth/2;
			var distanceToCenter = pyth(dx,dy);
			if(distanceToCenter < range){
				//normalize
				dx/=distanceToCenter;
				dy/=distanceToCenter;
				gravity *= (0.1+0.9*distanceToCenter/range); //Close to the center, gravity gets weaker
			}

			if(1){
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
			}

			ball.a.x += gx;
			ball.a.y += gy;


			ball.v.x = (ball.v.x + ball.a.x);
			ball.v.y = (ball.v.y + ball.a.y);

			if(1){
				ball.v.x *= FRICTION;
				ball.v.y *= FRICTION;
			}


			if(ball.v.x*ball.v.x+ball.v.y*ball.v.y > maxSpeed*maxSpeed){
				normalize(ball.v,maxSpeed);
			}
			ball.x += ball.v.x;
			ball.y += ball.v.y;

			//ball.x = clamp(ball.x,-50,totalSize+50);
			//ball.y = clamp(ball.y,-50,totalSize+50);

			//console.log("====================================================================================");
			//console.log("loop","collided",ball.collide,"boost",ball.boostCpt);



			ball.collide = false;
			var prevVx = ball.v.x;
			var prevVy = ball.v.y;
			for(i=0 , len=entities.length ; i<len ; i++){
				e = entities[i];

				if(e != ball){
					e.collide = false;
					var l;
					var collisionVector = tempVector;
					if(e.shape==CIRCLE){
						if(collideCircle(ball,e)){
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
						//console.log(i);

						var risingPad = e.kind == PADDLE && e.movingUp;
						if(!risingPad && collideLine(ball,e,collisionVector)){
							e.collide = true;

							/*
							if(e.kind==PADDLE && e.moving){
								console.log('collide moving pad');
							}
							*/

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
							var collide = collideLine(ball,e,collisionVector);
							var reverse = (e.table==1 || e.table==3);
							console.log("rising paddle",e,reverse?"REVERSE":"");
							var aboveBefore,aboveAfter;
							if(!collide){
								//No collision, but since the paddle moved, maybe the ball went through
								//Check if we are between the two paddle position

								computeLineEq(tempLineEq, e.x, e.y, e.prevX2, e.prevY2);
								aboveBefore = checkAboveLineEq(tempLineEq,ball.prevX,ball.prevY, reverse);

								console.log(" before",0, 0,"and", e.prevX2-e.x, e.prevY2- e.y,aboveBefore,"m",tempLineEq.m,"p",tempLineEq.p);
								console.log(" ball before:",ball.prevX-e.x,ball.prevY-e.y);

								computeLineEq(tempLineEq, e.x, e.y, e.x2, e.y2);
								aboveAfter = checkAboveLineEq(tempLineEq,ball.x,ball.y, reverse);

								console.log(" after",0, 0,"and", e.x2-e.x, e.y2-e.y ,aboveAfter,"m",tempLineEq.m,"p",tempLineEq.p);
								console.log(" ball now:",ball.x-e.x,ball.y-e.y);

							}else{
								console.log(" paddle direct collision");
							}

							if(collide || aboveBefore!==aboveAfter){
								if(!collide) console.log("  checking dotprod");
								//ball center is between the two lines
								var dx = ball.x-e.x;
								var dy = ball.y- e.y;
								var dotProd = dx*e._ux + dy* e._uy;
								if(collide || dotProd>0){
									//console.log("good side");
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
										console.log("   NORMALE PAD",nx,ny,e);
										if(e.mirror && (e.table===0 || e.table==3) || !e.mirror && (e.table==1 || e.table==2)){
										//if(e.mirror && !reverse || !e.mirror && reverse){
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

										//we handle collision in a different way for moving paddle
										ball.x += collisionVector.x * collisionVector.l;
										ball.y += collisionVector.y * collisionVector.l;
										ball.collide = true;

										//boost is proportional to the distance between the pad pivot and ball contact point
										var boostRatio = dproj/e.l;
										//boost ratio roughtly 0..1
										//make it more interesting going to the edge of the pad
										boostRatio = 0.2+(0.3*boostRatio+0.7*boostRatio*boostRatio); //interpolate somewhere between y=x and y=x^2

										var boostCpt = (boostRatio*20) >> 0;
										var speed = maxSpeed*boostRatio; //reach 60% of max speed
										/*
										if(!ball.boostCpt){
											//initial boost is proportionnal to ball velocity
											var ballSpeed = pyth(ball.v.x,ball.v.y);
											ballSpeed/=freeFallSpeed;
											if(ballSpeed>1) ballSpeed = 1; //just in case
											console.log("INTIAL BOOST",ballSpeed);
											speed += 0.4*ballSpeed;

										}
										*/
										var boostX = collisionVector.x*speed;
										var boostY = collisionVector.y*speed;

										if(!ball.boostCpt){
											ball.boostCpt = boostCpt;
											ball.boostX = boostX;
											ball.boostY = boostY;
										}else{
											//add a part of previous boost (give priority to initial impact
											ball.boostCpt += boostCpt>2 ? 2 : boostCpt;
											ball.boostX = 0.2*boostX + ball.boostX*0.8;
											ball.boostY = 0.2*boostY + ball.boostY*0.8;
										}
										ball.boostX *= (0.6+rand()*0.8); //randomize a little to avoid trajectories too often the same
										ball.boostY *= (0.6+rand()*0.8);

										console.log("   boosting",boostRatio,ball.boostCpt,ball.boostX,ball.boostY);

										continue;
									}
								}
							}
						}
					}
					if(e.collide){
						e.colCpt = 20;

						//collisonVector is the the normalized vector indicating how much we need to move the ball in order to remove collision
						// => move out of collision
						ball.x += collisionVector.x * collisionVector.l;
						ball.y += collisionVector.y * collisionVector.l;


						ball.collide = true;
						//console.log("collide before",collisonVector.x,collisonVector.y,collisonVector.l);
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

						var bounciness = e.kind == BUMPER ? 1.5 : 0.2;

						collisionVector.x *= cos * bounciness * vl;
						collisionVector.y *= cos * bounciness * vl;
						normaleX *= sin * vl;
						normaleY *= sin * vl;


						ball.v.x = collisionVector.x + normaleX;
						ball.v.y = collisionVector.y + normaleY;

						//console.log("collide",ball, e.shape,e);
					}
				}
			}
			ball.a.x = ball.a.y = 0;
			ball.prevX = ball.x;
			ball.prevY = ball.y;

			//console.log("ball speed:",ball.v.y);
			if(ball.x+ballRadius<0){
				started = false;
			}else if(ball.x-ballRadius>totalSize){
				started = false;
			}else if(ball.y+ballRadius<0){
				started = false;
			}else if(ball.y-ballRadius>totalSize){
				started = false;
			}
		}

		var shot;
		//move shots
		for(i=0 , len=shots.n ; i<len ; i++){
			shot = shots[i];
			shot.cpt--;
			if(shot.cpt>0){
				shot.x += shot.v.x;
				shot.y += shot.v.y;
			}
		}
		//remove finished shots
		for(i=0 ; i<shots.n ; i++){
			shot = shots[i];
			if(shot.cpt===0){
				//Swap shots
				shots[i] = shots[shots.n-1];
				shots[shots.n-1] = shot;
				shots.n--;
				i--;
			}
		}
	}

	/*
	//Makes sure ball stays in left table, params are used to make symmetrical checks in other tables
	function keepBallInTable(xTransform,reverse){
		var x = ball.x;
		var y = ball.y;
		var swap;
		if(reverse){
			swap = x;
			x = y;
			y = swap;
		}
		x = xTransform(x);

		//x,y as in left table
		if(x<tableHeight && x>0){
			if(y-ball.r<tableHeight+cornerRadius){
				y = tableHeight+cornerRadius+ball.r;
			}else if(y+ball.r>tableHeight+cornerRadius+tableWidth){
				y = tableHeight+cornerRadius+tableWidth-ball.r;
			}else{
				return;
			}
			console.log("keep ball in table");
			x = xTransform(x);
			if(reverse){
				swap = x;
				x = y;
				y = swap;
			}
			ball.x = x;
			ball.y = y;
		}
	}
	*/

	function updateCamera(){
		prevCameraX = cameraX;
		prevCameraY = cameraY;
		/*
		var x = ball.x - screenWidth/2;
		var y = ball.y - screenHeight/2;
		var dx = x-cameraX;
		var dy = y-cameraY;
		var d = pyth(dx,dy);
		var maxCamSpeed = 2;
		if(d>maxCamSpeed)
		dx = dx*maxCamSpeed/d;
		dy = dy*maxCamSpeed/d;

		x+=dx;
		y+=dy;
		x = clamp(x, 0, totalSize-screenWidth);
		y = clamp(y, 0, totalSize-screenHeight);
		cameraX = x;
		cameraY = y;
		*/
		/*
		if(false && started){
			//smooth transition to ideal position
			cameraX += (x-cameraX)*0.1;
			cameraY += (y-cameraY)*0.1;
		}else{
			cameraX = x;
			cameraY = y;
		}
		*/



		/*
		var x = ball.x - screenWidth/2;
		var y = ball.y - screenHeight/2;
		x = clamp(x, 0, totalSize-screenWidth);
		y = clamp(y, 0, totalSize-screenHeight);
		if(false){
			//smooth transition to ideal position
			cameraX += (x-cameraX)*0.1;
			cameraY += (y-cameraY)*0.1;
		}else{
			cameraX = x;
			cameraY = y;
		}
		*/



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
	drawCircle(fxCtx,halfSize,halfSize,200,"red");

	function render(){
		clearCanvas(renderCtx);
		clearCanvas(entityCtx);

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
			drawCircle(fxCtx,ball.x-cameraX,ball.y-cameraY,6, "orange");
			drawCircle(fxCtx,ball.prevX-cameraX,ball.prevY-cameraY,6, "orange");
		}else{
			drawCircle(fxCtx,ball.x-cameraX,ball.y-cameraY,2, "white");
		}

		//Draw ball position
		//drawCircle(bgCtx,ball.x,ball.y,10, ball.collide ? "red": ball.boostCpt > 0 ? "orange":"white");
		//Draw camera center position
		//drawCircle(bgCtx,cameraX+screenWidth/2,cameraY+screenHeight/2,1,TILE_LINE_COLOR_3);


		for(var i=0 , len=entities.length ; i<len ; i++){
			var e = entities[i];
			var x = e.x-cameraX;
			var y = e.y-cameraY;
			var fill, stroke, lineWidth;
			if(e==ball){
				if(startCpt>0 && !started){
					var shake = clamp(startCpt/startCptMax,0,1)*4 >>0;
					x += shake*rand() >> 0;
					y += shake*rand() >> 0;
					if(shake==4){
						stroke = "#f00";
					}
				}

				//draw camembert
				var dx,dy;
				var angle = Math.atan2(ball.v.y,ball.v.x);
				ball.cpt = (++ball.cpt)%20;
				var dAngle = ball.cpt;
				if(dAngle>10) dAngle = 20-dAngle;
				if(dAngle===0){
					drawCircle(entityCtx,ball.x-cameraX,ball.y-cameraY,ballRadius,BALL_FILL_COLOR,BALL_STROKE_COLOR);
				}else{
					entityCtx.strokeStyle = BALL_STROKE_COLOR;
					entityCtx.fillStyle = BALL_FILL_COLOR;
					entityCtx.lineWidth = 2;
					dAngle *= 0.3*PI/10;
					entityCtx.beginPath();
					entityCtx.arc(ball.x-cameraX,ball.y-cameraY,ball.r,angle+dAngle,angle-dAngle);
					entityCtx.lineTo(ball.x-cameraX,ball.y-cameraY);
					entityCtx.closePath();
					entityCtx.fill();
					entityCtx.stroke();
				}
			}else if(e.shape == CIRCLE){
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
				if(e.kind==BACKGROUND){
					stroke = 0;
				}else{
					stroke = WALL_COLOR;

					if(e.kind==PADDLE){
						stroke = PADDLE_COLOR;
						if(e.collide){
							stroke = COLLIDE_COLOR;
						}
					}
				}
				if(stroke){
					drawLine(entityCtx, e.x-cameraX, e.y-cameraY, e.x2-cameraX, e.y2-cameraY,stroke,2);
				}

				/*
				 //drawCircle(renderCtx,e.x-cameraX, e.y-cameraY,4,"red");
				 if(e.kind==PADDLE){
					drawLine(renderCtx, e.x-cameraX, e.y-cameraY, e.prevX2-cameraX, e.prevY2-cameraY,"yellow",2);
				}
				*/
			}
		}


		var shot;
		//draw shots
		for(i=0 , len=shots.n ; i<len ; i++){
			shot = shots[i];
			//drawLine(renderCtx, shot.x-cameraX, shot.y-cameraY, shot.x-shot.v.x-cameraX, shot.y-shot.v.y-cameraY,SHOT_COLOR,10);
			drawCircle(entityCtx, shot.x-cameraX, shot.y-cameraY, 4,SHOT_COLOR);
			drawLine(fxCtx, shot.x-cameraX, shot.y-cameraY, shot.x-shot.v.x-cameraX, shot.y-shot.v.y-cameraY,SHOT_COLOR,2);

			//drawCircle(fxCtx, shot.x-cameraX, shot.y-cameraY, 2, SHOT_COLOR);
			//drawCircle(fxCtx, shot.x-shot.v.x-cameraX, shot.y-shot.v.y-cameraY, 2, SHOT_COLOR);
		}

		/*
		//Draw velocity vector
		drawLine(entityCtx,
			ball.x-cameraX,
			ball.y-cameraY,
			ball.x-cameraX + ball.v.x*10,
			ball.y-cameraY + ball.v.y*10,
			"#0f0",3);
		*/

		drawImage(renderCtx, bgCanvas, -cameraX, -cameraY);
		drawImage(renderCtx, fxCanvas, 0, 0);
		drawImage(renderCtx, entityCanvas, 0, 0);

	}

	function tic(){
		processInput();
		updatePhysics();
		updateCamera();
		render();


		window.requestAnimationFrame(tic);
		//setTimeout(tic,1000);
	}


	init();
	tic();

	//------------------------------------------------------------------------------------------------------------------
	// entity functions
	//------------------------------------------------------------------------------------------------------------------

	function buildObjects(){

		ball = addEntity( makeCircle(halfSize, totalSize-50, ballRadius, BALL));
		ball.cpt = 0;
		//ball = addEntity( makeCircle(400, halfSize-80, ballRadius, BALL));

		addMultipleAndMirror( makeLine(0,220,150,100,OBSTACLE));


		//addMultipleAndMirror( makeCircle(70,260,30,BUMPER));
		//Create moving obstacles
		movingBumbers = [];
		var n = 10;
		for(var i=0 ; i<n ; i++){
			var r = 20+rand()*30;
			var dist = 80+r+(centerRadius-2*r-80)*i/n >>0;
			var angle = rand()*2*PI;
			var bumper = makeCircle(0,0,r,BUMPER); //position is computed in updatePhysics
			movingBumbers.push(addEntity(bumper));
			//move speed, in pixels per frame
			var speed = 0.1+rand()*0.2 * (rand()>0.5 ? -1:1);
			//da = angular speed in turns per frame.
			// speed*2PI*dist = speed
			bumper.da = speed/(dist*2*PI);
			bumper.a = angle;
			bumper.d = dist;
			console.log(bumper.da);
		}

		//addMultiple( makeCircle(600,400,30,BUMPER));
		//addMultiple( makeCircle(300,600,30,BUMPER));


		//addMultipleAndMirror( makeLine(100,450,200,450,OBSTACLE));


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
			if(pad.table==1 || pad.table==2) pad.amax*=-1;
		}
		//DEBUG single PAD
		//pads = [pads[1]];
		//entities = entities.slice(0,-8).concat(pads);
		//console.log(pads);
	}

	function makeEntity(shape,kind, x, y){
		return {
			x: x || 0, y: y || 0, shape:shape , kind:kind,
			v: {x:0, y:0},
			a: {x:0, y:0}
		};
	}
	function addEntity(e){
		entities.push(e);
		return e;
	}
	function removeEntity(e){
		var index = entities.indexOf(e);
		entities[index] = entities[entities.length-1];
		entities.pop();
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

	/*
	function addShape(data, kind){
		var items = [];
		var circle, line;
		for(var i= 0;i<data.pts.length;i++){
			var p = data.pts[i];
			circle = makeEntity(CIRCLE,"bump", p.x, p.y);
			circle.r = data.rs[i];
			items.push(circle);

			if(i>0){
				var p2 = data.pts[i-1];
				var r2 = data.rs[i-1];
				//compute perpendicular vector
				var dx = p.x-p2.x;
				var dy = p.y-p2.y;
				var n = pyth(dx,dy);
				var dx2 = -dy/n;
				var dy2 = dx/n;

				j=0;
				while(j<2){
					if(j==1){
						dx2 = -dx2;
						dy2 = -dy2;
					}
					line = makeEntity(LINE,"bump");
					line.r = 2;
					line.x = p.x + dx2*circle.r >> 0;
					line.y = p.y + dy2*circle.r >> 0;
					line.x2 = p2.x + dx2*r2 >> 0;
					line.y2 = p2.y + dy2*r2 >> 0;
					items.unshift(line);
					j++;
				}

			}

		}
		for(i=0 ; i<items.length ; i++){
			var entity = items[i];
			for(var j=0 ; j<4 ; j++){
				var clone = cloneObject(entity);
				convert(clone,"x","y",j);
				if(clone.shape==LINE){
					convert(clone,"x2","y2",j);
				}
				addEntity(clone);
			}
		}
	}
	*/

	function addMultiple(entity){
		for(var j=0 ; j<4 ; j++){
			var clone = cloneObject(entity);
			convert(clone,"x","y",j);
			if(clone.shape==LINE){
				convert(clone,"x2","y2",j);
			}
			addEntity(clone);
			clone.table = j;
		}
	}
	function addMultipleAndMirror(entity){
		addMultiple(entity);
		entity.x = tableWidth-entity.x;
		if(entity.shape==LINE){
			entity.x2 = tableWidth-entity.x2;
		}
		entity.mirror = true;
		addMultiple(entity);
	}

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

	// c: color string or canvas/image
	function fillRect(ctx,x,y,w,h,c){
		if(c){
			if(c.width){
				ctx.fillStyle = ctx.createPattern(c, 'repeat');
			}else{
				ctx.fillStyle = c;
			}
		}
		ctx.fillRect(x,y,w,h);
	}

	function drawImage(){
		var a = [].slice.call(arguments);
		var ctx = a.shift();
		ctx.drawImage.apply(ctx,a);
	}

	function drawCircle(ctx,x,y,radius,fill,stroke,width){
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, 2 * PI, false);
		if(fill){
			ctx.fillStyle = fill;
			ctx.fill();
		}
		if(stroke){
			ctx.lineWidth = width || 2;
			ctx.strokeStyle = stroke;
			ctx.stroke();
		}
		ctx.closePath();
	}

	function drawLine(ctx,x,y,x2,y2,color,width){
		ctx.strokeStyle = color;
		ctx.lineWidth = width || 2;
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
		37: "left",
		38: "up",
		39: "right",
		40: "down",
		32: "space",
		27: "esc",
		82: "R",
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
};
;(function() {
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
}());