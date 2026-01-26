attribute vec3 aPosition;
        attribute vec3 aNormal;
        attribute vec2 aTexCoord;  // UV texture coordinates
        
        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        uniform mat4 uNormalMatrix;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vTexCoord;  // Pass to fragment shader
        
        void main() {
            vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);
            vPosition = worldPosition.xyz;
            vNormal = normalize((uNormalMatrix * vec4(aNormal, 0.0)).xyz);
            vTexCoord = aTexCoord;
            gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
        }
