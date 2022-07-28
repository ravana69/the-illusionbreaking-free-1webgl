var gl = c.getContext( 'experimental-webgl', { preserveDrawingBuffer: true } )
	,	w = c.width = window.innerWidth
	,	h = c.height = window.innerHeight

	,	opts = {
		particleAmount: 10000,
		gravity: .001,
		baseDist: 30,
		addedDist: 40,
		baseVelDistMult: .3,
		addedVelDistMult: .2,
		particleAlpha: .5,
		repaintAlpha: .4
	}

	,	webgl = {};

webgl.vertexShaderSource = `
attribute vec2 a_pos;
uniform vec2 u_res;
uniform float u_tick;
uniform int u_mode;
varying vec4 v_color;

vec3 h2rgb( float h ){
	return vec3( clamp( abs( mod( h * 6. + vec3( 0, 4, 2 ), 6. ) - 3. ) -1., 0., 1. ) );
}
void main(){
	
	v_color = u_mode == 0 ? vec4( h2rgb( atan( a_pos.y, a_pos.x ) / 6.2831853071795864769252867665590057683943 * 2. + u_tick / 300. ), ${opts.particleAlpha}) : vec4( 0, 0, 0, ${opts.repaintAlpha});
	gl_Position = u_mode == 0 ? vec4( vec2(1.,-1.) * ( a_pos / u_res ), 0, 1 ) : vec4( a_pos * 2. - 1., 0, 1 );
}
`
webgl.fragmentShaderSource = `
precision mediump float;
varying vec4 v_color;

void main(){
	gl_FragColor = v_color;
}
`;

webgl.vertexShader = gl.createShader( gl.VERTEX_SHADER );
gl.shaderSource( webgl.vertexShader, webgl.vertexShaderSource );
gl.compileShader( webgl.vertexShader );

webgl.fragmentShader = gl.createShader( gl.FRAGMENT_SHADER );
gl.shaderSource( webgl.fragmentShader, webgl.fragmentShaderSource );
gl.compileShader( webgl.fragmentShader );

webgl.shaderProgram = gl.createProgram();
gl.attachShader( webgl.shaderProgram, webgl.vertexShader );
gl.attachShader( webgl.shaderProgram, webgl.fragmentShader );
gl.linkProgram( webgl.shaderProgram );

gl.useProgram( webgl.shaderProgram );

webgl.attribLocs = {
	pos: gl.getAttribLocation( webgl.shaderProgram, 'a_pos' )
};
webgl.buffers = {
	pos: gl.createBuffer()
};
webgl.uniformLocs = {
	res: gl.getUniformLocation( webgl.shaderProgram, 'u_res' ),
	tick: gl.getUniformLocation( webgl.shaderProgram, 'u_tick' ),
	mode: gl.getUniformLocation( webgl.shaderProgram, 'u_mode' )
};

gl.enableVertexAttribArray( webgl.attribLocs.pos );
gl.bindBuffer( gl.ARRAY_BUFFER, webgl.buffers.pos );
gl.vertexAttribPointer( webgl.attribLocs.pos, 2, gl.FLOAT, false, 0, 0 );

gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
gl.enable( gl.BLEND );

function resize(){
	w = c.width = window.innerWidth;
	h = c.height = window.innerHeight;
	
	gl.viewport( 0, 0, w, h );
	gl.uniform2f( webgl.uniformLocs.res, w, h );
}
resize();

webgl.posData = [];
webgl.draw = function( glType ){
	
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( webgl.posData ), gl.STATIC_DRAW );
	gl.drawArrays( glType, 0, webgl.posData.length / 2 );
}
webgl.clear = function(){
	
	webgl.posData = [
		0, 0,
		0, 1,
		1, 0,
		1, 0,
		0, 1,
		1, 1
	];
	
	gl.uniform1i( webgl.uniformLocs.mode, 1 );
	webgl.draw( gl.TRIANGLES );
	gl.uniform1i( webgl.uniformLocs.mode, 0 );
	
	webgl.posData.length = 0;
}

var tick = 0
	,	particles = [];

function Particle( x, y ){
	
	var radius, angle;
	
	if( x === undefined ){
		radius = opts.baseDist + opts.addedDist * ( 1 - Math.sqrt( Math.random() ) );
		angle = Math.random() * 6.28318530717958647692528676655;
		
		x = radius * Math.cos( angle );
		y = radius * Math.sin( angle );
		
	} else {
		
		x *= 2;
		y *= 2;
		
		radius = Math.sqrt( x*x + y*y );
		angle = Math.atan( y / x );
		if( x < 0 )
			angle += Math.PI;
	}
	
	this.x = x;
	this.y = y;
	
	var vAngle = angle + Math.PI / 2
		,	vSize = ( opts.baseVelDistMult + opts.addedVelDistMult * Math.random() ) * radius;
	
	this.vx = vSize * Math.cos( vAngle );
	this.vy = vSize * Math.sin( vAngle );
}
Particle.prototype.step = function(){
	
	var px = this.x
		,	py = this.y;
	
	this.vx -= opts.gravity * this.x;
	this.vy -= opts.gravity * this.y;
	
	this.x += this.vx;
	this.y += this.vy;
	
	webgl.posData.push(
		px, py,
		this.x, this.y
	);
}

function anim(){
	
	window.requestAnimationFrame( anim );
	
	++tick;
	
	gl.uniform1f( webgl.uniformLocs.tick, tick );
	
	webgl.clear();
	
	if( particles.length < opts.particleAmount && Math.random() < .5 )
		for( var i = 0; i < 10; ++i )
			particles.push( new Particle );
	
	particles.map( function( p ){ p.step(); } );
	
	webgl.draw( gl.LINES );
}
anim();

window.addEventListener( 'resize', resize );

var mdown = false;
c.addEventListener( 'mousedown', function( e ){
	mdown = true;
	
	particles.push( new Particle( e.clientX - w / 2, e.clientY - h / 2 ) );
});
c.addEventListener( 'mousemove', function( e ){
	if( mdown )
		particles.push( new Particle( e.clientX - w / 2, e.clientY - h / 2 ) );
});
c.addEventListener( 'mouseup', function(){
	mdown = false;
})

document.querySelector('.point').addEventListener( 'click', function(){
	particles.length = 0;
})