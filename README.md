# Peanball

This is the game I created for the JS13K contest of 2014, the theme was "The Elements: Earth, Water, Air and Fire"


### Concept

The core concept of the game was to make a four-sided pinball, having on element on each side. During development, I realized that a pinball game si no fun without a solid physics engine, so I tweaked the concept a little, adding mouse control. The result is not quite what I expected but is still playable.


### Code

I tried to make things a little cleaner than last year, plugging grunt to concat and minify the sources automatically. I still worried too much about making the code as small as possible, relying on many local functions instead of having classes. While I think it does save some space, it was not weally worth it since I still have a few kb left in the end.



### External code

I relied on Mr Doob stats.js lib during debug:
https://github.com/mrdoob/stats.js/

And on jsfx for the sound:
https://github.com/mneubrand/jsfxr

Using code provided by Jack Rugile for the integration of jsfxr:
http://codepen.io/jackrugile/blog/arcade-audio-for-js13k-games
