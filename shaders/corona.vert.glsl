attribute vec3 aPosition;
        
        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        
        void main() {
            vPosition = aPosition;
            vec4 worldPos = uModelMatrix * vec4(aPosition, 1.0);
            vWorldPosition = worldPos.xyz;
            gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
        }
