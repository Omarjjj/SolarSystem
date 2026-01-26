attribute vec3 aPosition;
        attribute float aSize;
        
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        
        varying float vBrightness;
        
        void main() {
            vBrightness = aSize;
            gl_Position = uProjectionMatrix * uViewMatrix * vec4(aPosition, 1.0);
            gl_PointSize = aSize * 2.5;
        }
