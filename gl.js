import buildingShaderSrc from './building.vert.js';
import flatShaderSrc from './flat.vert.js';
import fragmentShaderSrc from './fragment.glsl.js';

var gl;

var layers = null

var modelMatrix;
var projectionMatrix;
var viewMatrix;

var currRotate = 0;
var currZoom = 0;
var currProj = 'perspective';

/*
    Vertex shader with normals
*/
class BuildingProgram {
    constructor() {
        this.vertexShader = createShader(gl, gl.VERTEX_SHADER, buildingShaderSrc);
        this.fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
        this.program = createProgram(gl, this.vertexShader, this.fragmentShader);

        // TODO: set attrib and uniform locations
        this.positionAttributeLocation = gl.getAttribLocation(this.program, "position");
        this.colorAttribLoc = gl.getAttribLocation(this.program, "vColor");
        this.normalAttribLoc = gl.getAttribLocation(this.program, "normal");

        this.modelLoc = gl.getUniformLocation(this.program, "uModel");
        this.projLoc = gl.getUniformLocation(this.program, 'uProjection');
        this.viewLoc = gl.getUniformLocation(this.program, 'uView');
        this.colorUniformLocation = gl.getUniformLocation(this.program, 'uColor');
    }

    use() {
        gl.useProgram(this.program);
    }
}

/*
    Vertex shader with uniform colors
*/
class FlatProgram {
    constructor() {
        this.vertexShader = createShader(gl, gl.VERTEX_SHADER, flatShaderSrc);
        this.fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
        this.program = createProgram(gl, this.vertexShader, this.fragmentShader);

        // TODO: set attrib and uniform locations
        this.positionAttributeLocation = gl.getAttribLocation(this.program, "position");
        this.colorAttribLoc = gl.getAttribLocation(this.program, "vColor");
        
        this.modelLoc = gl.getUniformLocation(this.program, "uModel");
        this.projLoc = gl.getUniformLocation(this.program, 'uProjection');
        this.viewLoc = gl.getUniformLocation(this.program, 'uView');
        this.colorUniformLocation = gl.getUniformLocation(this.program, 'uColor');
    }

    use() {
        gl.useProgram(this.program);
    }
}


/*
    Collection of layers
*/
class Layers {
    constructor() {
        this.layers = {};
        this.centroid = [0,0,0];
    }

    addBuildingLayer(name, vertices, indices, normals, color){
        var layer = new BuildingLayer(vertices, indices, normals, color);
        layer.init();
        this.layers[name] = layer;
        this.centroid = this.getCentroid();
    }

    addLayer(name, vertices, indices, color) {
        var layer = new Layer(vertices, indices, color);
        layer.init();
        this.layers[name] = layer;
        this.centroid = this.getCentroid();
    }

    removeLayer(name) {
        delete this.layers[name];
    }

    draw() {
        for(var layer in this.layers) {
            this.layers[layer].draw(this.centroid);
        }
    }

    
    getCentroid() {
        var sum = [0,0,0];
        var numpts = 0;
        for(var layer in this.layers) {
            numpts += this.layers[layer].vertices.length/3;
            for(var i=0; i<this.layers[layer].vertices.length; i+=3) {
                var x = this.layers[layer].vertices[i];
                var y = this.layers[layer].vertices[i+1];
                var z = this.layers[layer].vertices[i+2];
    
                sum[0]+=x;
                sum[1]+=y;
                sum[2]+=z;
            }
        }
        return [sum[0]/numpts,sum[1]/numpts,sum[2]/numpts];
    }
}

/*
    Layers without normals (water, parks, surface)
*/
class Layer {
    constructor(vertices, indices, color) {
        this.vertices = vertices;
        this.indices = indices;
        this.color = color;
    }

    init() {
        this.program = new FlatProgram();
        // TODO: create program, set vertex and index buffers, vao
        this.positionBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this.vertices));
        this.indexBuffer = createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.indices));
        this.colorb = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this.color));
        // Create VAO
        console.log(this.program.colorAttribLoc);
        const colorBuffr = [1.0, 0.0, 0.0, 1.0];
        this.vao = createVAO(gl, this.program.positionAttributeLocation, this.positionBuffer, null, null, this.program.colorUniformLocation, this.colorb);
    }

    draw(centroid) {
        
        updateModelMatrix(centroid);
        updateViewMatrix(centroid);
        updateProjectionMatrix(centroid);
        this.program.use();
        // TODO: use program, update model matrix, view matrix, projection matrix 
        // TODO: set uniforms
        gl.uniformMatrix4fv(this.program.modelLoc, false, new Float32Array(modelMatrix));
        gl.uniformMatrix4fv(this.program.viewLoc, false, new Float32Array(viewMatrix));
        gl.uniformMatrix4fv(this.program.projLoc, false, new Float32Array(projectionMatrix));
        gl.uniform4fv(this.program.colorUniformLocation, this.color);
        // TODO: bind vao, bind index buffer, draw elements
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_INT, 0);
    }
}

/*
    Layer with normals (building)
*/
class BuildingLayer extends Layer {
    constructor(vertices, indices, normals, color) {
        super(vertices, indices, color);
        this.normals = normals;
    }

    init() {
        this.program = new BuildingProgram();
        this.positionBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this.vertices));
        this.normalBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this.normals));
        this.indexBuffer = createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.indices));
        // TODO: create program, set vertex, normal and index buffers, vao
        this.vao = createVAO(gl, this.program.positionAttributeLocation, this.positionBuffer, this.program.normalAttribLoc, this.normalBuffer, this.program.colorAttribLoc, null);

    }

    draw(centroid) {
        this.program.use();
        // TODO: use program, update model matrix, view matrix, projection matrix
        updateModelMatrix(centroid);
        updateViewMatrix(centroid);
        updateProjectionMatrix(centroid);
        // TODO: set uniforms
        gl.uniformMatrix4fv(this.program.modelLoc, false, new Float32Array(modelMatrix));
        gl.uniformMatrix4fv(this.program.viewLoc, false, new Float32Array(viewMatrix));
        gl.uniformMatrix4fv(this.program.projLoc, false, new Float32Array(projectionMatrix));
        gl.uniform4fv(this.program.colorUniformLocation, this.color);
        // TODO: bind vao, bind index buffer, draw elements
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_INT, 0);
    }
}

/*
    Event handlers
*/
window.updateRotate = function() {
    currRotate = parseInt(document.querySelector("#rotate").value);
}

window.updateZoom = function() {
    currZoom = parseFloat(document.querySelector("#zoom").value);
}

window.updateProjection = function() {
    currProj = document.querySelector("#projection").value;
}

/*
    File handler
*/
window.handleFile = function(e) {
    var reader = new FileReader();
    reader.onload = function(evt) {
        // TODO: parse JSON
        var fileContent = evt.target.result;
        var parsed = JSON.parse(fileContent);
        for(var layer in parsed){
            switch (layer) {
                // TODO: add to layers
                case 'buildings':
                    // TODO
                    //layers.addBuildingLayer(layer, parsed[layer].coordinates, parsed[layer].indices, parsed[layer].normals, parsed[layer].color);
                    break;
                case 'water':
                    // TODO
                    //break;
                case 'parks':
                    // TODO
                    //break;
                case 'surface':
                    // TODO
                    layers.addLayer(layer, parsed[layer].coordinates, parsed[layer].indices, parsed[layer].color);
                    break;
                default:
                    break;
            }
        }
    }
    reader.readAsText(e.files[0]);
}

/*
    Update transformation matrices
*/
function updateModelMatrix(centroid) {
    // TODO: update model matrix
    var position = translateMatrix(0, 0, -50);
    modelMatrix = position;
}

function updateProjectionMatrix() {
    
    var aspect = window.innerWidth / window.innerHeight;

    projectionMatrix = perspectiveMatrix(45.0 * Math.PI / 180.0, aspect, 1, 500);
    // TODO: update projection matrix
}

function updateViewMatrix(centroid){
    // TODO: update view matrix
    // TIP: use lookat function
    
    const eye = [0, 0, 10]; // Camera position
    const target = centroid; // Look-at point
    const up = [0, 1, 0]; // Up vector
    //console.log(viewMatrix, eye, target, up);
    viewMatrix = lookAt(eye[0], eye[1], eye[2], target[0], target[1], target[2], up[0], up[1], up[2]);
}

/*
    Main draw function (should call layers.draw)
*/
function draw() {

    gl.clearColor(190/255, 210/255, 215/255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    layers.draw();

    requestAnimationFrame(draw);

}

/*
    Initialize everything
*/
function initialize() {

    var canvas = document.querySelector("#glcanvas");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    gl = canvas.getContext("webgl2");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);

    layers = new Layers();

    window.requestAnimationFrame(draw);

}


window.onload = initialize;