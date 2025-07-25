/*

Awkward Mushroom

Prisha B.

2022-01-17

Live code: https://www.shadertoy.com/view/ftKXDt

*/

//*******************************************************//

const float EPSILON = 0.001;
const float MAX_DIST = 60.0;
const int AA = 3;
const float FRESNEL_POWER = 5.0;

// Structs

// Light struct
struct Light {
    bool isPointLight;
    vec3 clr;
    float shadowSoftness; // higher number -> crisper shadows
    // if isPointLight, set position, else set direction
    vec3 pos;
    vec3 dir;
    float brightness;
};

// create a light
Light createLight(in vec3 pt, in bool isPointLight, in float fadeAdjust, in float shadowSoftness, in vec3 dirOrPos, in vec3 clr) {

    Light light;
    light.clr = clr;
    light.shadowSoftness = shadowSoftness;

    if (isPointLight) {
        // point light
        light.pos = dirOrPos;
        light.isPointLight = true;
        // calculate brightness and direction
        float d = distance(pt, light.pos);
        d = pow(d, fadeAdjust);
        light.brightness = 1.0 / (d * d);
        light.dir = normalize(light.pos - pt);
    } else {
		// directional light
        light.brightness = 1.0;
        light.dir = dirOrPos;
    }

    return light;

}

// Material struct
struct Material {
    vec3 clr; // color
    float amb; // ambient
    float dif; // diffuse
    float spec; // specular
    float shininess;
    vec3 ref; // reflect clr
    float fresnel; // multiply fresnel calculated by float between 0.0 and 1.0
    vec3 groundBounceClr; // bounce color from ground
    int id; // unique identifier
};

// return a nondescript material
Material defaultMaterial() {
    Material mat;
    mat.amb = 0.05;
    mat.clr = vec3(0.05);
    mat.dif = 1.0;
    mat.spec = 1.0;
    mat.shininess = 10.0;
    mat.ref = vec3(0.0);
    mat.fresnel = 0.0;
    mat.groundBounceClr = vec3(0.0);
    mat.id = -1;
    return mat;
}

//*******************************************************//

// clamp value from 0 to 1
float uclamp(float val) {
    return clamp(val, 0.0, 1.0);
}

// SMOOTH MIN from Inigo Quilez
// https://iquilezles.org/articles/smin

float smoothmin(in float a, in float b, in float k) {
    float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
	return mix(b, a, h) - k*h*(1.0-h);
}

// smoothmax
float smoothmax( float a, float b, float k ) {
	float h = max(k-abs(a-b),0.0);
	return max(a, b) + h*h*0.25/k;
}

// Smooth min for distance and color
// returns rgb and d in vec4
vec4 smoothmin(in float a, in float b, in vec3 clr1, in vec3 clr2, in float k) {
	float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
	// distance
	float d = mix(b, a, h) - k*h*(1.0-h);
	// color
	vec3 c = mix(clr2, clr1, h);
	return vec4(c, d);
}

// return points for finite and infinite repetition

vec3 infRep(in vec3 pt, in vec3 period) {
	return mod(pt + 0.5 * period, period) - 0.5 * period;
}

vec3 finRep(in vec3 pt, in vec3 period, in vec3 minLim, in vec3 maxLim) {
	return pt - period * clamp(round(pt/period), minLim, maxLim);
}

vec3 finRep(in vec3 pt, in vec3 period, in vec3 lim) {
	return pt - period * clamp(round(pt/period), -lim, lim);
}


//*******************************************************//

// random and noise

// https://thebookofshaders.com/10/
float random(in float v) {
	return fract(15465.1327854 * sin(v * 231.72));
}

float random(in vec2 v) {
	return fract(15465.1327854 * sin(dot(v, vec2(173.93422, 102.5165))));
}

float random(in vec3 v) {
	return fract(15465.1327854 * sin(dot(v, vec3(173.93422, 102.5165, 23.1234))));
}

float noise(in float v) {
    float fid = fract(v); // fraction part
    fid = fid * fid * (3.0 - 2.0 * fid);
    float id = floor(v); // integer part
    return mix(random(id), random(id + 1.0), fid);
}

float noise(in vec2 uv) {
    
	vec2 fid = fract(uv); // fraction part of uv -> where in the grid
	fid = fid * fid * (3.0 - 2.0 * fid);
	vec2 id = floor(uv); // integer part of uvw -> which grid
	
	// corners of square
	float bl = random(id + vec2(0, 0));
	float br = random(id + vec2(1, 0));
	float tl = random(id + vec2(0, 1));
	float tr = random(id + vec2(1, 1));
	
	// interpolate between corner
	float b = mix(bl, br, fid.x);
	float t = mix(tl, tr, fid.x);
	return mix(b, t, fid.y);
    
}

float noise(in vec3 uvw) {

	vec3 f = fract(uvw); // fraction part of uvw -> where in the grid cell
	f = f * f * (3.0 - 2.0 * f);
	vec3 i = floor(uvw); // integer part of uvw -> which grid cell
	
	// lerp bottom face
	float bf = mix(random(i + vec3(0, 0, 0)), random(i + vec3(1, 0, 0)), f.x);
	float bb = mix(random(i + vec3(0, 0, 1)), random(i + vec3(1, 0, 1)), f.x);
	float b = mix(bf, bb, f.z);

	// lerp top face
	float tf = mix(random(i + vec3(0, 1, 0)), random(i + vec3(1, 1, 0)), f.x);
	float tb = mix(random(i + vec3(0, 1, 1)), random(i + vec3(1, 1, 1)), f.x);
	float t = mix(tf, tb, f.z);
	
	return mix(b, t, f.y);
	
}

float fractalNoise(in float u, in int iter) {
    float s1 = 1.0, s2 = 4.0;
    float c = 0.0;
    for (int i = 0; i < iter; i++) {
        c += s1 * noise(u * s2);
        s1 *= 0.5;
        s2 *= 2.0;
    }
    c /= 2.0;
    return c;
}

float fractalNoise(in vec3 uvw) {
	float c = noise(uvw * 4.0);
	c += 0.5 * noise(uvw * 8.0);
	c += 0.25 * noise(uvw * 16.0);
	c += 0.125 * noise(uvw * 32.0);
	c += 0.0625 * noise(uvw * 64.0);
	c /= 2.0;
	return c;
}

//*******************************************************//

// SDFs

float sdSphere(in vec3 pt, in float rad) {
	return length(pt) - rad;
}

float sdEllipsoid(in vec3 pt, in vec3 rad) {
	float k0 = length(pt/rad);
	float k1 = length(pt/(rad*rad));
	return k0 * (k0-1.0)/k1;
}

// https://www.youtube.com/watch?v=PMltMdi1Wzg
float sdCapsule(in vec3 pt, in vec3 a, in vec3 b, in float r) {
	vec3 apt = pt - a;
	vec3 ab = b - a;
	float t = clamp(dot(apt, ab) / dot(ab, ab), 0.0, 1.0);
	return length( apt - ab * t ) - r;
}

// https://www.youtube.com/watch?v=62-pRVZuS5c
float sdBox(vec3 pt, vec3 b) {
	vec3 q = abs(pt) - b;
	return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

//*******************************************************//

vec3 setCamera(in vec2 uv, in vec3 ro, in vec3 target) {
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0, 1, 0)));
    vec3 up = normalize(cross(right, forward));
    // ray direction
    vec3 rd = normalize(uv.x * right + uv.y * up + 1.2 * forward);
    return rd;
}


//*******************************************************//

// SDF MUSHROOM

float sdMushroom(in vec3 pt, out Material mat) {

	// distance to closest object
	float res;
	
	// default
	mat = defaultMaterial();
    mat.amb = 0.05;
    
    float ang = atan(pt.z, pt.x);
    vec3 q = pt - vec3(0, 5, 0);
    
    // mushroom stalk
    {
        float stalk;
        // cylinder
        stalk = length(q.xz) - 1.6; 
        stalk = smoothmax(stalk, abs(pt.y - 5.0) - 3.0, 0.7);
        // ellipsoid mushroom body
        float r2 = 2.2 + sin(ang * 2.0) * 0.4;
        stalk = smoothmin(stalk, sdEllipsoid(q - vec3(0, -3, 0), vec3(r2, 2.9, r2)), 4.0);
        // ellipsoid top part that connects to head
        float r3 = 3.6 + sin(ang*20.0) * 0.04;
        stalk = smoothmin(stalk, sdEllipsoid(q - vec3(0, 3.5, 0), vec3(r3, 0.5, r3)), 1.5); 
        stalk += sin(ang * 15.0) * 0.2;
    
        // stalk
        res = stalk;
        mat.id = 1;
        mat.fresnel = 0.5;
   
    }

    // mushroom head
    {
        float head;
        vec3 h = q - vec3(0, 2.2, 0);
        float r1 = 5.6;
        h.y -= 2.7 * smoothstep(r1, r1*0.2, length(h.xz));
        head = sdEllipsoid(h, vec3(r1, 3, r1));
        head = smoothmin(head, sdEllipsoid(h - vec3(4.0, 1, 0), vec3(1.8, 1.5, 4.0)), 2.5); // right
        head = smoothmin(head, sdEllipsoid(h - vec3(-4.0, 1, -1), vec3(2.0, 1.0, 3.0)), 2.0); // left
        head = smoothmax(head, -h.y, 0.8); // cut off bottom
        head = smoothmax(head, -(length(h - vec3(0, -3, 0)) - r1*0.5), 0.7); // subtract a sphere on inside
        head += pow((sin(ang*25.0)+1.0) * 0.5, 6.0) * 0.2 * smoothstep(12.0, 5.0, pt.y); // ridges

        if (head < res) {
            res = head;
            mat.id = 2;
            mat.spec = 1.0;
            mat.shininess = 20.0;
            // mushroom texture and color
            mat.clr = vec3(0.04, 0.01, 0.02);
            mat.clr += 0.1 * texture(iChannel1, pt.xy * 0.45).rgb;
            // spots
            vec2 section = vec2(ang * 13.0, length(pt.xz) * 0.7); // create a "grid" based on angle and radius (polar)
            vec2 i = floor(section); // integer part
            vec2 f = fract(section); // fractional part
            float r = random(i); // random number
            res -= mat.clr.r * 0.8; // bumpy texture
            if (r > 0.6) {
                float l = distance(f, vec2(0.5));
                float c = smoothstep(0.5, 0.0, l); // for circle based on distance from center of "grid cell"
                vec3 spotClr = 2.8 * vec3(0.055, 0.03, 0.011) * (0.5 + 0.5*random(floor(section*0.3)));
                mat.clr = mix(mat.clr, spotClr, c); // mix red mushroom color and spot clr
                // little depressions where spots are
                float depressions = c * 0.28 * smoothstep(0.9, 0.7, l) * smoothstep(15.5, 10.0, pt.y); 
                res += depressions;
            }
        }
    }
      
	return res;
    
}

// MAIN SD FUNCTION

float sdf(in vec3 pt, out Material mat) {
    
    // distance to closest object
    float res;
    
    mat = defaultMaterial();
    
    // ground
    vec3 groundClr = vec3(0.34, 0.2, 0.5) * 0.15 + 0.1*texture(iChannel2, pt.xz*0.04).rgb;
    {
        res = pt.y;
        float ang = atan(pt.z,pt.x);
        res -= smoothstep(15.0, 30.0, length(pt.xz)) * (5.0  + 4.0*fractalNoise(ang, 3));
        res -= 0.2*noise(pt.xz) + 0.1*noise(pt.xz*2.0);
        mat.id = 0;
        mat.spec = 0.0;
        mat.clr = groundClr;
    }
    
    // the mushroom
    if (length(pt - vec3(0, 6, 0)) < 10.0 && pt.y > 0.25) {
        Material mushroomMat;
        float mushroom = sdMushroom(pt, mushroomMat);
        if (mushroom < res) {
            res = mushroom;
            mat = mushroomMat;
        }
        
    }
    
    mat.groundBounceClr = groundClr * 3.0;
    
    return res;

}

//*******************************************************//

// https://iquilezles.org/articles/normalsSDF
vec3 calcNormal(in vec3 pt) {
	vec2 h = vec2(EPSILON, 0);
	Material m;
	// central difference sdf(pt + EPSILON) - sdf(pt - EPSILON)    
	return normalize(vec3(
		sdf(pt + h.xyy, m) - sdf(pt - h.xyy, m),
		sdf(pt + h.yxy, m) - sdf(pt - h.yxy, m),
		sdf(pt + h.yyx, m) - sdf(pt - h.yyx, m)
	));
}

//*******************************************************//

float castRay(in vec3 ro, in vec3 rd, out Material mat) {

	// total distance traveled
	float td = 0.0;
	
	for (int i = 0; i < 100; i++) {
		float h = sdf(ro + td*rd, mat);
		// if distance is really close, break
		if (abs(h) < (0.0001*td)) break;
		// add to total distance
		td += h;
		// if too far, break
		if (td >= MAX_DIST) {
			mat.id = -1;
			mat.ref = vec3(0.0);
			mat.fresnel = 0.0;
			break;
		}
	}
	
	return td;
    
}

// https://iquilezles.org/articles/rmshadows
float softShadow(in vec3 ro, in vec3 rd, in float k) {
	float res = 1.0; // result
	float td = 0.05; // total distance traveled
	for (int i = 0; i < 200 && td < MAX_DIST; i++) {
		Material m;
		float d = sdf(ro + td*rd, m);
		if (d < 0.001) {
			// intersection, so return shadow
			return 0.0;
		}
		res = min(res, k*d/td);
		td += d;
	}
	// if no intersection -> shadow 0.0 to light 1.0
	return res;
}

// https://www.shadertoy.com/view/3lsSzf
// ambient occlusion
float calcOcc(in vec3 pt, in vec3 nor) {

	float occ = 0.0;
	float scl = 1.0;
	
	Material m; // placeholder
	
	for (int i = 0; i < 5; i++) {
		float h = 0.01 + 0.11 * 0.25 * float(i);
		float d = sdf(pt + h * nor, m);
		occ += (h-d)*scl;
		scl *= 0.95;
	}
	
	return uclamp(1.0 - 2.0 * occ);
    
}

//*******************************************************//

vec3 calcLighting(in vec3 pt, in vec3 rd, in vec3 nor, in Light light, in Material mat) {

	// diffuse
	float dif = uclamp(dot(nor, light.dir)) * mat.dif;
	
	// shadow
	float shadow = light.isPointLight ? 1.0 : softShadow(pt, light.dir, light.shadowSoftness);
	
	// specular
	vec3 ref = reflect(light.dir, nor);
	float spec = pow(uclamp(dot(rd, ref)), mat.shininess) * mat.spec;

	// return dif * clr * shadow * spec + dif * clr * shadow; 
	return light.brightness * light.clr * shadow * dif * (spec + 1.0);
    
}

// https://iquilezles.org/articles/fog
vec3 applyFog(in vec3 rd, in float d, in vec3 clr, in vec3 sunClr, in vec3 sunDir, in vec3 skyClr) {
    // mix sun clr with sky clr to get fog clr
	vec3 fogClr = mix( skyClr, sunClr, pow(max(dot(rd, sunDir), 0.0), 15.0) );
    // mix pixel clr with fog clr
	return mix(clr, fogClr, 1.0 - exp(-0.00002 * d * d * d));
}

//*******************************************************//

vec3 calcClr(in vec3 ro, in vec3 rd, in float d, in vec3 nor, inout Material mat) {

	vec3 pt = ro + rd * d;

	// COLORS
	vec3 skyClr = vec3(0.45, 0.4, 0.2) * 0.5;
	
	// LIGHTS
    Light sky = createLight(pt, false, 1.0, 2.0, normalize(vec3(0, 1,  0)), skyClr);
    Light sun = createLight(pt, false, 1.0, 25.0, normalize(vec3(-2, 0.1, -5)), vec3(10.0, 8.0, 3.7));
	
	// background color
	vec3 clr = skyClr;

	// return background if too far (id is -1.0)
	if (mat.id == -1) {
		// sun
		clr = mix(skyClr, sun.clr * 0.15, pow(max(dot(rd, sun.dir), 0.0), 10.0));
		return clr;
	}
    
    // materials
    
    // stalk
    if (mat.id == 1) {
        mat.spec = 0.5;
        mat.shininess = 5.0;
        // stalk texture and color
        mat.clr = vec3(0.07, 0.07, 0.045) * 1.15;
        mat.clr += vec3(0.03) * sin(30.0 * atan(pt.z, pt.x)) * smoothstep(5.0, 8.0, pt.y);
        mat.clr += texture(iChannel1, pt.xy * vec2(0.25, 0.15)).r * 0.06;
        mat.clr -= (0.04 + 0.05 * smoothstep(4.0, -1.0, pt.y)) * texture(iChannel0, pt.yx * 0.3 + 0.1*sin(pt.z)).rgb;
   }
    
    // mushroom fresnel
    if (mat.id == 1 || mat.id == 2) {
        mat.fresnel = 1.0 * -dot(vec3(0, -1, 0), nor);
    }
    
    // material id is not -1.0, so we hit an obj
	clr = mat.clr;
	
	// LIGHTS
	
	// CALCULATE COLOR
	float occ = calcOcc(pt, nor); // ambient occlusion
	vec3 light = vec3(mat.amb); // ambient
    light += calcLighting(pt, rd, nor, sky, mat); // sky diffuse
    light += calcLighting(pt, rd, nor, sun, mat); // sun light
    
    // point lights
    {
        for (float r = 6.0; r < 20.0; r+=3.0) {
            for (float i = 0.0; i < 6.0; i++) {
                float ang = r + i + 2.0*random(r);
                vec3 lpos = vec3(r * cos(ang), pt.y + 1.2, r * sin(ang));
                vec3 lclr = vec3(50.0 + 20.0*random(fract(sin(i)*121.0)), 40.0 + 20.0*random(ang), 10.0 + 20.0*random(i*r*ang)) * (0.2 + 0.05*random(ang*r*i));
                Light ptLight = createLight(pt, true, 2.0 + 1.5*fract(21.0*sin(r+i*20.0)), 5.9, lpos, lclr);
                light += calcLighting(pt, rd, nor, ptLight, mat);
            }
        }
    }
    
	light += (uclamp(dot(nor, vec3(0, -1, 0)))*0.8 + 0.2) * mat.groundBounceClr; // ground diffuse

	clr *= light * occ;

	clr = applyFog(rd, d, clr, sun.clr * 0.1, sun.dir, skyClr);
	
	return clr;

}

//*******************************************************//

vec3 render(in vec3 ro, in vec3 rd) {
    
	Material mat;

	float d = castRay(ro, rd, mat); // distance to point on object in scene
	vec3 nor = calcNormal(ro + rd*d); // surface normal
	
	// calculate color of the pixel
	vec3 clr = calcClr(ro, rd, d, nor, mat);
	
	bool willReflect = mat.ref.r > 0.0 || mat.ref.g > 0.0 || mat.ref.b > 0.0;
	if (mat.fresnel > 0.0 || willReflect) {
	
		int bounces = 1;
		vec3 ref = vec3(0.0);
		float fresnel = 0.5 * uclamp(pow(1.0 - dot(nor, -rd), FRESNEL_POWER));
		
		// if the material will reflect
		if (willReflect) {
			bounces = 3;
			// if reflective and doesn't have fresnel
			if (mat.fresnel == 0.0) ref = mat.ref;
			// if reflective with fresnel
			else ref = fresnel * mat.ref;
		} else {
			ref = vec3(fresnel);
		}
		
		// bouncing around for fresnel and reflection
		vec3 fil = vec3(1.0);
		for (int i = 0; i < bounces; i++) {
			fil *= ref;
			// to intersection point and reflect
			ro += rd*d + nor*EPSILON*3.0;
			rd = reflect(rd, nor);
			// find new point
			d = castRay(ro, rd, mat);
			nor = calcNormal(ro + rd*d);
			// add color
			clr += fil * calcClr(ro, rd, d, nor, mat);
			if (mat.id == -1) break;
		}
			
	}
	
	clr = pow(clr, vec3(1.0 / 2.2)); // gamma correction
	return clr;
    
}

//*******************************************************//

void mainImage(out vec4 fragColor, in vec2 fragCoord) {

    if (iFrame != 0) discard;

	vec2 res = iResolution.xy;
    // float time = iTime * 0.5;
	
	// target
	vec3 target = vec3(0, 4.8, 0);
	// ray origin
    vec3 ro = vec3(0, 4.2, 13);
	
	// accumulate color
	vec3 clr = vec3(0.0);
	
	for (int i = 0; i < AA; i++) {
		for (int j = 0; j < AA; j++) {
			// Normalized pixel coordinates
			vec2 f = gl_FragCoord.xy + vec2(float(i), float(j)) / float(AA);
			vec2 uv = (2.0*f - res) / min(res.x, res.y);
			vec3 rd = setCamera(uv, ro, target);
			// calculate color based on distance, etc
			clr += render(ro, rd);
		}
	}    
	
	clr /= float(AA*AA);

	// Output to screen
	fragColor = vec4(clr, 1.0);
    
}
