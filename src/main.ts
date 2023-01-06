import { multiply, cos, sin } from "mathjs";
import "./css/style.css";
import defaultObj from "./obj/default";

type ObjectType = {
  name: string,
  points: number[][],
  faces: number[][],
}

type OptionsType = {
  rotateX?: number,
  rotateY?: number,
  rotateZ?: number,
  distance?: number,
  scale?: number,
}

const form: HTMLFormElement = document.querySelector("form")!;
const objFileInput: HTMLInputElement = document.querySelector("input")!;

const canvas: HTMLCanvasElement = document.querySelector("canvas")!;
const context = canvas.getContext("2d")!;

const loadModel = (data: string) => {
  const objects: ObjectType[] = [];
  const lines = data.split("\n");

  lines.forEach((line) => {
    line = line.trim();

    const parts = line.split(" ");

    if (line.startsWith("o ")) { // object name
      objects.push({
        name: parts[1],
        points: [],
        faces: [],
      });
    } else if (line.startsWith("v ")) { // points/vertices
      objects[objects.length - 1].points.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (line.startsWith("f ")) { // faces
      objects[objects.length - 1].faces.push(parts.slice(1).map((f) => parseFloat(f.split("/")[0])));
    }
  });

  return objects;
}

let currentRendererId: string;

const previewModel = (objects: ObjectType[], options: OptionsType = {}) => {
  // set renderer id
  const rendererId = crypto.randomUUID();
  currentRendererId = rendererId;

  // zoom
  let scale = options.scale || 1;

  // distance from model
  let distance = options.distance || 10;

  // x rotation
  let xAngle = 0;

  // y rotation
  let yAngle = 0;

  // z rotation
  let zAngle = 0;

  document.addEventListener("wheel", (event) => {
    distance -= event.deltaY * 0.01;
  });

  const mouseButtonPressed: { [button: number]: boolean } = {};

  document.addEventListener("mousedown", (event) => {
    mouseButtonPressed[event.button] = true;
  });

  document.addEventListener("mouseup", (event) => {
    mouseButtonPressed[event.button] = false;
  });

  document.addEventListener("mousemove", (event) => {
    if (mouseButtonPressed[0]) {
      yAngle += event.movementX * -0.01;
      xAngle += event.movementY * 0.01;
    }
  });

  const render = () => {
    if (options.rotateX) {
      xAngle += options.rotateX;
    }

    if (options.rotateY) {
      yAngle += options.rotateY;
    }

    if (options.rotateZ) {
      zAngle += options.rotateZ;
    }

    const rotateX = [
      [1, 0, 0],
      [0, cos(xAngle), -sin(xAngle)],
      [0, sin(xAngle), cos(xAngle)],
    ];

    const rotateY = [
      [cos(yAngle), 0, sin(yAngle)],
      [0, 1, 0],
      [-sin(yAngle), 0, cos(yAngle)],
    ];

    const rotateZ = [
      [cos(zAngle), -sin(zAngle), 0],
      [sin(zAngle), cos(zAngle), 0],
      [0, 0, 1],
    ];

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#ffffff";
    context.fillStyle = "#ffffff";

    const projectedPoints: number[][] = [];

    objects.forEach((object) => {
      object.points.forEach((point) => {
        point = multiply(point, rotateX);
        point = multiply(point, rotateY);
        point = multiply(point, rotateZ);

        const z = -1 / (distance - point[2]);

        const projection = [
          [z, 0, 0],
          [0, z, 0],
        ];

        let projected = multiply(projection, point);
        projected = multiply(projected, 200) as number[];
        projected = projected.map((p, index) => p * scale + (index ? (canvas.height / 2) : (canvas.width / 2)));

        projectedPoints.push(projected);

        context.beginPath();
        context.arc(projected[0], projected[1], 3 * scale, 0, 2 * Math.PI, false);
        context.stroke();
        context.fill();
      });

      object.faces.forEach((faces) => {
        faces.forEach((face, index) => {
          const p1 = projectedPoints[face - 1];
          const p2 = projectedPoints[(index + 1 < faces.length ? faces[index + 1] - 1 : faces[0] - 1)];

          context.beginPath();
          context.moveTo(p1[0], p1[1]);
          context.lineTo(p2[0], p2[1]);
          context.stroke();
        });


      });
    });

    if (currentRendererId === rendererId) {
      window.requestAnimationFrame(render);
    } else {
      console.warn("Stopped renderer: " + rendererId)
    }
  }

  window.requestAnimationFrame(render);
};

const defaultModel = loadModel(defaultObj);
previewModel(defaultModel, { distance: 2, rotateY: 0.005 });

objFileInput.addEventListener("change", (event) => {
  const files = (event.target as HTMLInputElement).files;

  if (!files?.length) return;

  const file = files[0];
  const fileReader = new FileReader();

  fileReader.readAsText(file);

  fileReader.onload = (() => {
    if (!fileReader.result) return;

    const objects = loadModel(fileReader.result as string);

    form.style.display = "none";

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    previewModel(objects);
  });
});

export { };