class Game {
  constructor(options) {
    const {
      background = 0xfefefe,
      cubeColor = 0xbebebe,
      jumperColor = 0xe0c738,
      debug = true,
    } = options;
    //基础的信息 属性
    this.config = {
      background, // 背景颜色
      ground: -1, // 地面坐标
      cubeColor,
      cubeWidth: 4,
      cubeHeight: 2,
      cubeDeep: 4,
      jumperColor, // 跳的块 颜色
      jumperWidth: 1,
      jumperHeight: 2,
      jumperDeep: 1,
      debug,
    };
    this.score = 0; // 分数
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.size = { width: window.innerWidth, height: window.innerHeight };

    // 正交相机
    this.camera = new THREE.OrthographicCamera(
      window.innerWidth / -50,
      window.innerWidth / 50,
      window.innerHeight / 50,
      window.innerHeight / -50,
      0,
      5000
    );
    // 记录镜头当前位置、镜头下一个位置
    this.cameraPros = { current: new THREE.Vector3(0, 0, 0), next: new THREE.Vector3() };
    this.cubes = []; // 各个方块(跳板)
    this.cubeStat = { nextDir: "" }; // 记录左边还是右边
    this.falledStat = {
      location: -1, // 记录落在哪里 -1:落在当前块上
      distance: 0,
    };
    // 下落过程状态
    this.fallingStat = {
      end: false,
      speed: 0.2,
    };
    this.jumperStat = {
      ready: false, // 是否准备好可以跳
      xSpeed: 0,
      ySpeed: 0,
    }
  };
  init() {
    this._addAxisHelp();
    this._setCamera(); // 设置相机位置
    this._setRenderer(); // 设置渲染
    this._setLight(); // 设置灯光
    this._createCube();
    this._createCube();
    this._createJumper();
    this._updateCamera(); // 调整相机镜头
    this._handleWindowResize();
    window.addEventListener("resize", () => {
      this._handleWindowResize();
    });
    const canvas = document.querySelector("canvas");
    const handleDown = () => {
      this._handleMouseDown();
    };
    const handUp = () => {
      this._handleMouseUp();
    };
    canvas.addEventListener("mousedown", handleDown);
    canvas.addEventListener("mouseup", handUp);

    canvas.addEventListener("touchstart", handleDown);
    canvas.addEventListener("touchend", handUp);
  };
  addSuccessFn(fn) {
    this.successCallback = fn;
  };
  addFailedFn(fn) {
    this.failedCallback = fn;
  }
  _addAxisHelp() {
    if (this.config.debug) {
      // let axis = new THREE.AxisHelper(20);
      // this.scene.add(axis);
      const axesHelper = new THREE.AxesHelper(1);
      this.scene.add(axesHelper);
    }
  }
  _handleWindowResize() {
    this._setSize();
    this.camera.left = this.size.width / -50;
    this.camera.right = this.size.width / 50;
    this.camera.top = this.size.height / 50;
    this.camera.bottom = this.size.height / -50;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.size.width, this.size.height);
    this._render();
  };
  _handleMouseDown() {
    if (!this.jumperStat.ready && this.jumper.scale.y > 0.02) {
      //y 压缩jumper
      this.jumper.scale.y -= 0.01;
      this.jumperStat.xSpeed += 0.004;
      this.jumperStat.ySpeed += 0.008;
      this._render();
      requestAnimationFrame(() => {
        this._handleMouseDown();
      })
    }
  };
  _handleMouseUp() {
    this.jumperStat.ready = true;
    if (this.jumper.position.y >= 1) { // 还在空中
      if (this.jumper.scale.y < 1) {
        this.jumper.scale.y += 0.1;
      }
      if (this.cubeStat.nextDir === "left") {
        this.jumper.position.x -= this.jumperStat.xSpeed;
      } else {
        this.jumper.position.z -= this.jumperStat.xSpeed;
      }
      this.jumperStat.ySpeed -= 0.01;
      this.jumper.position.y += this.jumperStat.ySpeed; // 垂直方向移动
      this._render();
      requestAnimationFrame(() => {
        this._handleMouseUp();
      })
    } else {
      this.jumperStat.ready = false;
      this.jumper.scale.y = 1;
      this.jumper.position.y = 1;
      this.jumperStat.xSpeed = 0;
      this.jumperStat.ySpeed = 0;
      //检测落在哪里了
      this._checkInCube();
      if (this.falledStat.location === 1) {
        //成功了
        this.score++;
        this._createCube();
        this._updateCamera();
        if (this.successCallback) {
          this.successCallback(this.score);
        }
      } else {
        //失败
        this._falling();
      }
    }
  };
  _checkInCube() {
    //-1:当前盒子上
    // -10:从当前盒子上掉落
    // 1: 下一个盒子上
    // 10:从下一个盒子上掉落
    // 0:没有落在盒子上

    // 距离当前和下一个的距离
    let distanceCur, distanceNext;
    let should = (this.config.cubeWidth + this.config.jumperWidth) / 2;
    if (this.cubeStat.nextDir === "left") {
      distanceCur = Math.abs(this.cubes[this.cubes.length - 2].position.x - this.jumper.position.x);
      distanceNext = Math.abs(this.cubes[this.cubes.length - 1].position.x - this.jumper.position.x)
    } else {
      distanceCur = Math.abs(this.cubes[this.cubes.length - 2].position.z - this.jumper.position.z);
      distanceNext = Math.abs(this.cubes[this.cubes.length - 1].position.z - this.jumper.position.z)
    }
    if (distanceCur < should) {
      //落在当前块上
      this.falledStat.location = distanceCur < this.config.cubeWidth / 2 ? -1 : -10;
    } else if (distanceNext < should) {
      //落在下一个块
      this.falledStat.location = distanceNext < this.config.cubeWidth / 2 ? 1 : 10;
    } else {
      //没有落在块上
      this.falledStat.location = 0;
    }
  };
  _falling() {
    //-10,10,0
    //-10:从当前盒子落下  leftTop  rightTop
    //10:从下一个盒子落下  leftTop leftBottom  rightTop  rightBottom
    //0 :none
    if (this.falledStat.location === 10) {
      if (this.cubeStat.nextDir === "left") {
        if (this.jumper.position.x > this.cubes[this.cubes.length - 1].position.x) {
          this._fallingDir("leftBottom");
        } else {
          this._fallingDir("leftTop");
        }
      } else {
        if (this.jumper.position.z > this.cubes[this.cubes.length - 1].position.z) {
          this._fallingDir("rightBottom");
        } else {
          this._fallingDir("rightTop");
        }
      }
    } else if (this.falledStat.location === -10) {
      if (this.cubeStat.nextDir === "left") {
        this._fallingDir("leftTop");
      } else {
        this._fallingDir("rightTop");
      }
    } else if (this.falledStat.location === 0) {
      this._fallingDir("none");
    }
  };
  _fallingDir(dir) {
    let offset = this.falledStat.distance - this.config.cubeWidth / 2;
    let axis = dir.includes("left") ? "z" : 'x';
    let isRotate = this.jumper.rotation[axis] < Math.PI / 2;
    let rotate = this.jumper.rotation[axis];
    let fallingTo = this.config.ground + this.config.jumperWidth / 2;
    if (dir === "leftTop") {
      rotate += 0.1;
      isRotate = this.jumper.rotation[axis] < Math.PI / 2;
    } else if (dir === "leftBottom") {
      rotate -= 0.1;
      isRotate = this.jumper.rotation[axis] > -Math.PI / 2;
    } else if (dir === "rightTop") {
      rotate -= 0.1;
      isRotate = this.jumper.rotation[axis] > -Math.PI / 2;
    } else if (dir === "rightBottom") {
      rotate += 0.1;
      isRotate = this.jumper.rotation[axis] < Math.PI / 2;
    } else if (dir === "none") {
      fallingTo = this.config.ground;
      isRotate = false;
    }
    if (!this.fallingStat.end) {
      if (isRotate) {
        this.jumper.rotation[axis] = rotate;
      } else if (this.jumper.position.y > fallingTo) {
        this.jumper.position.y -= this.fallingStat.speed;
      } else {
        this.fallingStat.end = true;
      }
      this._render();
      requestAnimationFrame(() => {
        this._falling();
      });
    } else {
      if (this.failedCallback) {
        this.failedCallback();
      }
    }


  };

  //设置相机位置
  _setCamera() {
    this.camera.position.set(100, 100, 100);
    //镜头对准
    this.camera.lookAt(this.cameraPros.current)
  };

  //设置render
  _setRenderer() {
    this.renderer.setSize(this.size.width, this.size.height);
    this.renderer.setClearColor(this.config.background);
    document.body.appendChild(this.renderer.domElement);
  };

  //创建cube
  _createCube() {
    const { cubeWidth, cubeHeight, cubeDeep, cubeColor } = this.config;
    let geometry = new THREE.BoxGeometry(cubeWidth, cubeHeight, cubeDeep);
    let material = new THREE.MeshLambertMaterial({ color: cubeColor });
    let cube = new THREE.Mesh(geometry, material);
    if (this.cubes.length) {
      //随机一个方向 Left  right
      this.cubeStat.nextDir = Math.random() > 0.5 ? "left" : "right";
      cube.position.x = this.cubes[this.cubes.length - 1].position.x;
      cube.position.y = this.cubes[this.cubes.length - 1].position.y;
      cube.position.z = this.cubes[this.cubes.length - 1].position.z;
      if (this.cubeStat.nextDir === "left") {
        //X
        cube.position.x -= Math.random() * 4 + 6;
      } else {
        //z
        cube.position.z -= Math.random() * 4 + 6;
      }
    }
    this.cubes.push(cube);
    if (this.cubes.length > 6) {
      this.scene.remove(this.cubes.shift());
    }
    this.scene.add(cube);
    if (this.cubes.length > 1) {
      //更新镜头的位置
      this._updateCameraPros();
    }
  };
  //创建jumper
  _createJumper() {
    let geometry = new THREE.BoxGeometry(this.config.jumperWidth, this.config.jumperHeight, this.config.jumperDeep);
    let material = new THREE.MeshLambertMaterial({ color: this.config.jumperColor });
    this.jumper = new THREE.Mesh(geometry, material);
    geometry.translate(0, 1, 0);
    this.jumper.position.y = 1;
    this.scene.add(this.jumper);
  };

  _updateCameraPros() {
    //计算出next 
    //当前块和下一个块的中间位置
    const lastIndex = this.cubes.length - 1;
    const pointA = {
      x: this.cubes[lastIndex - 1].position.x,
      z: this.cubes[lastIndex - 1].position.z,
    };
    const pointB = {
      x: this.cubes[lastIndex].position.x,
      z: this.cubes[lastIndex].position.z,
    };
    this.cameraPros.next = new THREE.Vector3((pointA.x + pointB.x) / 2, 0, (pointA.z + pointB.z) / 2);
  };

  //改变相机的镜头
  _updateCamera() {
    if (this.cameraPros.current.x > this.cameraPros.next.x || this.cameraPros.current.z > this.cameraPros.next.z) {
      if (this.cubeStat.nextDir === "left") {
        this.cameraPros.current.x -= 0.1;
      } else {
        this.cameraPros.current.z -= 0.1;
      }
      if (this.cameraPros.current.x - this.cameraPros.next.x < 0.05) {
        this.cameraPros.current.x = this.cameraPros.next.x;
      } else if (this.cameraPros.current.z - this.cameraPros.next.z < 0.05) {
        this.cameraPros.current.z = this.cameraPros.next.z;
      }
    }

    // 调整镜头
    this.camera.lookAt(this.cameraPros.current);
    this._render();
    requestAnimationFrame(() => {
      this._updateCamera();
    })
  }

  //设置灯光
  _setLight() {
    let directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
    directionalLight.position.set(3, 10, 5);
    this.scene.add(directionalLight);
    let light = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(light);
  };

  //渲染render
  _render() {
    this.renderer.render(this.scene, this.camera);
  };

  //设置size
  _setSize() {
    this.size = {
      width: window.innerWidth,
      height: window.innerHeight
    }
  };

  _restart() {
    //重置某些值
    this.score = 0;
    this.falledStat = { location: -1, distance: 0 };
    this.fallingStat = { end: false, speed: 0.2 };
    this.cameraPros = { current: new THREE.Vector3(0, 0, 0), next: new THREE.Vector3(0, 0, 0) };
    //删除场景中的几何体
    this.scene.remove(this.jumper);
    this.cubes.forEach(item => this.scene.remove(item));
    this.cubes = [];
    //重新开始
    this._createCube();
    this._createCube();
    this._createJumper();
    this._updateCamera();
  }
}