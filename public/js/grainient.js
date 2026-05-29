// ─── grainient.js — WebGL2 Grainient background (zero dependencies) ────────────
// Vanilla JS port of React Bits Grainient component.
// Uses raw WebGL2 — no OGL, no CDN, no extra requests.

const VERTEX_SRC = `#version 300 es
in vec2 position;
void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT_SRC = `#version 300 es
precision highp float;
uniform vec2  iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2  uCenterOffset;
uniform float uZoom;
uniform vec3  uColor1;
uniform vec3  uColor2;
uniform vec3  uColor3;
out vec4 fragColor;

#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);}
float noise(vec2 p){
    vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
    return 0.5+0.5*mix(
        mix(dot(-1.0+2.0*hash(i),f),dot(-1.0+2.0*hash(i+vec2(1,0)),f-vec2(1,0)),u.x),
        mix(dot(-1.0+2.0*hash(i+vec2(0,1)),f-vec2(0,1)),dot(-1.0+2.0*hash(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);
}

void main(){
    float t  = iTime * uTimeSpeed;
    vec2  uv = gl_FragCoord.xy / iResolution;
    float ratio = iResolution.x / iResolution.y;
    vec2 tuv = uv - 0.5 + uCenterOffset;
    tuv /= max(uZoom, 0.001);

    float degree = noise(vec2(t*0.1, tuv.x*tuv.y) * uNoiseScale);
    tuv.y *= 1.0/ratio;
    tuv *= Rot(radians((degree-0.5)*uRotationAmount+180.0));
    tuv.y *= ratio;

    float ws = max(uWarpStrength, 0.001);
    float amp = uWarpAmplitude / ws;
    float wt = t * uWarpSpeed;
    tuv.x += sin(tuv.y * uWarpFrequency + wt) / amp;
    tuv.y += sin(tuv.x * (uWarpFrequency*1.5) + wt) / (amp*0.5);

    float b=uColorBalance, s=max(uBlendSoftness,0.0);
    float blendX = (tuv * Rot(radians(uBlendAngle))).x;
    vec3 layer1 = mix(uColor3, uColor2, S(-0.3-b-s, 0.2-b+s, blendX));
    vec3 layer2 = mix(uColor2, uColor1, S(-0.3-b-s, 0.2-b+s, blendX));
    vec3 col    = mix(layer1, layer2, S(0.5-b+s, -0.3-b-s, tuv.y));

    vec2 grainUv = uv * max(uGrainScale, 0.001);
    if (uGrainAnimated > 0.5) grainUv += vec2(iTime * 0.05);
    float grain = fract(sin(dot(grainUv, vec2(12.9898, 78.233))) * 43758.5453);
    col += (grain - 0.5) * uGrainAmount;

    col = (col - 0.5) * uContrast + 0.5;
    float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(luma), col, uSaturation);
    col = pow(max(col, 0.0), vec3(1.0 / max(uGamma, 0.001)));
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r
        ? [parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255]
        : [1, 1, 1];
}

function compileShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
    }
    return s;
}

function createProgram(gl, vertSrc, fragSrc) {
    const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    if (!vert || !frag) {
        return null;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(prog));
        return null;
    }
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    return prog;
}

/**
 * Mount the Grainient WebGL2 background on a container element.
 * @param {HTMLElement} container
 * @param {object} opts
 * @returns {function} cleanup
 */
export function mountGrainient(container, opts = {}) {
    const o = Object.assign(
        {
            color1: '#a29bfe',
            color2: '#0d033b',
            color3: '#6c63ff',
            timeSpeed: 0.18,
            colorBalance: 0.0,
            warpStrength: 0.8,
            warpFrequency: 4.0,
            warpSpeed: 1.5,
            warpAmplitude: 60.0,
            blendAngle: 0.0,
            blendSoftness: 0.05,
            rotationAmount: 400.0,
            noiseScale: 2.5,
            grainAmount: 0.06,
            grainScale: 2.0,
            grainAnimated: false,
            contrast: 1.3,
            gamma: 1.0,
            saturation: 1.1,
            centerX: 0.0,
            centerY: 0.0,
            zoom: 0.85,
        },
        opts
    );

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    container.prepend(canvas);

    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) {
        console.warn('Grainient: WebGL2 not supported — falling back to CSS background.');
        container.style.background =
            'linear-gradient(135deg, #0d033b 0%, #2d1b69 50%, #0a0a18 100%)';
        return () => {};
    }

    const prog = createProgram(gl, VERTEX_SRC, FRAGMENT_SRC);
    if (!prog) {
        return () => {};
    }

    // Full-screen triangle (covers clip space with a single triangle)
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // Cache uniform locations
    const ul = {};
    const unifNames = [
        'iTime',
        'iResolution',
        'uTimeSpeed',
        'uColorBalance',
        'uWarpStrength',
        'uWarpFrequency',
        'uWarpSpeed',
        'uWarpAmplitude',
        'uBlendAngle',
        'uBlendSoftness',
        'uRotationAmount',
        'uNoiseScale',
        'uGrainAmount',
        'uGrainScale',
        'uGrainAnimated',
        'uContrast',
        'uGamma',
        'uSaturation',
        'uCenterOffset',
        'uZoom',
        'uColor1',
        'uColor2',
        'uColor3',
    ];
    unifNames.forEach((n) => {
        ul[n] = gl.getUniformLocation(prog, n);
    });

    gl.useProgram(prog);

    // Set static uniforms
    gl.uniform1f(ul.uTimeSpeed, o.timeSpeed);
    gl.uniform1f(ul.uColorBalance, o.colorBalance);
    gl.uniform1f(ul.uWarpStrength, o.warpStrength);
    gl.uniform1f(ul.uWarpFrequency, o.warpFrequency);
    gl.uniform1f(ul.uWarpSpeed, o.warpSpeed);
    gl.uniform1f(ul.uWarpAmplitude, o.warpAmplitude);
    gl.uniform1f(ul.uBlendAngle, o.blendAngle);
    gl.uniform1f(ul.uBlendSoftness, o.blendSoftness);
    gl.uniform1f(ul.uRotationAmount, o.rotationAmount);
    gl.uniform1f(ul.uNoiseScale, o.noiseScale);
    gl.uniform1f(ul.uGrainAmount, o.grainAmount);
    gl.uniform1f(ul.uGrainScale, o.grainScale);
    gl.uniform1f(ul.uGrainAnimated, o.grainAnimated ? 1.0 : 0.0);
    gl.uniform1f(ul.uContrast, o.contrast);
    gl.uniform1f(ul.uGamma, o.gamma);
    gl.uniform1f(ul.uSaturation, o.saturation);
    gl.uniform2f(ul.uCenterOffset, o.centerX, o.centerY);
    gl.uniform1f(ul.uZoom, o.zoom);
    gl.uniform3fv(ul.uColor1, hexToRgb(o.color1));
    gl.uniform3fv(ul.uColor2, hexToRgb(o.color2));
    gl.uniform3fv(ul.uColor3, hexToRgb(o.color3));

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
        const w = Math.max(1, container.offsetWidth);
        const h = Math.max(1, container.offsetHeight);
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(ul.iResolution, canvas.width, canvas.height);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    let raf = 0;
    let isVisible = true,
        isPageVisible = !document.hidden;
    const t0 = performance.now();

    const loop = (t) => {
        gl.uniform1f(ul.iTime, (t - t0) * 0.001);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        raf = requestAnimationFrame(loop);
    };

    const tryStart = () => {
        if (isVisible && isPageVisible && !raf) {
            raf = requestAnimationFrame(loop);
        }
    };
    const tryStop = () => {
        if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
        }
    };

    const io = new IntersectionObserver(
        ([e]) => {
            isVisible = e.isIntersecting;
            isVisible ? tryStart() : tryStop();
        },
        { threshold: 0 }
    );
    io.observe(container);

    const onVis = () => {
        isPageVisible = !document.hidden;
        isPageVisible ? tryStart() : tryStop();
    };
    document.addEventListener('visibilitychange', onVis);

    tryStart();

    return () => {
        tryStop();
        ro.disconnect();
        io.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        gl.deleteProgram(prog);
        gl.deleteBuffer(buf);
        gl.deleteVertexArray(vao);
        try {
            container.removeChild(canvas);
        } catch {
            /* ignore */
        }
    };
}
