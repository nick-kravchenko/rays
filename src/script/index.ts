import '../style/index.scss';

const canvasElement: HTMLCanvasElement = document.getElementById('main-canvas') as HTMLCanvasElement;
let widthPx = window.innerWidth;
let heightPx = window.innerHeight;
canvasElement.width = widthPx;
canvasElement.height = heightPx;
const ctx: CanvasRenderingContext2D = canvasElement.getContext('2d');

type Point = [number, number];
type Line = [Point, Point];
type Star = [
  Point,
  Point[],
];

const pointRadius = 4;
const depth = 1;
let rayCount = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lineToLineCollisionPoint(intersectLine: Line, intersectedLine: Line): Point | null {
  const [intersectLineStart, intersectLineEnd]: [Point, Point] = intersectLine;
  const [x1, y1]: [number, number] = intersectLineStart;
  const [x2, y2]: [number, number] = intersectLineEnd;

  const [intersectedLineStart, intersectedLineEnd]: [Point, Point] = intersectedLine;
  const [x3, y3]: [number, number] = intersectedLineStart;
  const [x4, y4]: [number, number] = intersectedLineEnd;

  const denominator: number = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denominator === 0) return null;

  const t: number = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
  const u: number = ((x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2)) / denominator;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    const intersectionX = (x1 + t * (x2 - x1));
    const intersectionY = (y1 + t * (y2 - y1));

    return [intersectionX, intersectionY];
  }

  return null;
}

function getStarFromPoint(point: Point, segments: number, obstaclesLines: Line[] = [], endPoint?: Point): Star {
  // const threshold = pointRadius;
  let starAngle = 0;
  const points: Point[] = [];
  const [centerX, centerY] = point;
  if (typeof endPoint !== 'undefined') {
    const [endPointX, endPointY]: [number, number] = endPoint;
    const heightCat1 = centerX - endPointX;
    const heightCat2 = centerY - endPointY;
    starAngle = heightCat2 / heightCat1;
  }
  const radius = Math.hypot(widthPx, heightPx);
  for (let i = 0; i < segments; i++) {
    const angle: number = (i * Math.PI * 2 / segments) + starAngle;
    let x: number = centerX + Math.cos(angle) * radius;
    let y: number = centerY + Math.sin(angle) * radius;
    let closestIntersectionPoint: Point|undefined;
    for (const obstacleLine of obstaclesLines) {
      const intersectionPoint = lineToLineCollisionPoint([[centerX, centerY], [x, y]], obstacleLine);
      if (!intersectionPoint) continue;
      if (!closestIntersectionPoint) {
        closestIntersectionPoint = intersectionPoint;
        continue;
      }
      const d1 = (closestIntersectionPoint[0] - centerX)**2 + (closestIntersectionPoint[1] - centerY)**2;
      const d2 = (intersectionPoint[0] - centerX)**2 + (intersectionPoint[1] - centerY)**2;
      closestIntersectionPoint = d1 > d2 ? intersectionPoint : closestIntersectionPoint;
    }
    if (closestIntersectionPoint) {
      const [intersectionX, intersectionY] = closestIntersectionPoint;
      x = ~~(intersectionX === x ? intersectionX : intersectionX < x ? intersectionX - pointRadius : intersectionX + pointRadius);
      y = ~~(intersectionY === y ? intersectionY : intersectionY < y ? intersectionY - pointRadius : intersectionY + pointRadius);
    }
    // if ((Math.abs(centerX - x)**2 + Math.abs(centerY - y))**2 > threshold**2) {
      points.push([x, y]);
    // }
  }

  return [point, points];
}

function expandStars(starsToExpand: Star[], depth: number, obstaclesLines: Line[] = [], endPoint?: Point): Star[] {
  const endStars: Star[] = [...starsToExpand];

  while (depth > 0) {
    const expandedStars: Star[] = [];
    depth--;
    for (const star of endStars) {
      for(const rayEndCoords of star[1]) {
        const starExists = endStars.some(([centerPoint]) => {
          return (centerPoint[0] - rayEndCoords[0])**2 + (centerPoint[1] - rayEndCoords[1])**2 < (pointRadius * 2)**2;
        });
        if (starExists) continue;
        const newStar = getStarFromPoint(rayEndCoords, rayCount, obstaclesLines, endPoint);
        expandedStars.push(newStar);
      }
    }
    endStars.push(...expandedStars);
  }

  return endStars;
}

function getPolygonLines(centerPoint: Point, segments: number, radius: number, angleTransform: number = 0): Line[] {
  const lines: Line[] = [];
  const [centerX, centerY] = centerPoint;
  let prevPoint: Point|undefined;
  for (let i = 0; i <= segments; i++) {
    const angle = (i * Math.PI * 2 / segments) + angleTransform;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    if (!prevPoint) {
      prevPoint = [x, y];
    } else {
      lines.push([prevPoint, [x, y]]);
      prevPoint = [x, y];
    }
  }
  return lines;
}

function renderDebug(debug: { [key: string]: string|number|boolean }): void {
  const strings = [];
  for (const [key, value] of Object.entries(debug)) {
    strings.push(`${key}: ${value}`);
  }
  ctx.save();
  ctx.beginPath();
  ctx.font = '400 16px/16px JetBrains Mono, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  const bgWidth = strings.reduce((size, str) => ctx.measureText(str).width > size ? ctx.measureText(str).width : size, 0);
  ctx.fillStyle = 'rgba(0, 0, 0, .5)';
  ctx.strokeStyle = '#fff';
  ctx.rect(
    widthPx - bgWidth - 32,
    0,
    bgWidth + 32,
    strings.length * 16 + 32,
  );
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  let i = 0;
  for (const string of strings) {
    ctx.fillText(string, widthPx - 16, (i * 16) + 16);
    i++;
  }
  ctx.restore();
}

function renderPoint(point: Point): void {
  ctx.save();
  ctx.beginPath()
  ctx.arc(...point, pointRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#f00';
  ctx.fill();
  ctx.restore();
}

function renderStar(star: Star, color?: string): void {
  const [
    centerPoint,
    raysPoints,
  ]: [Point, Point[]] = star;
  const [centerX, centerY] = centerPoint;
  ctx.save();
  let i = 0;
  for (const rayPoint of raysPoints) {
    if (!color) {
      const hue = (360 / 16) * i;
      ctx.strokeStyle = `hsla(${hue}, 50%, 50%, 1)`;
      ctx.fillStyle = `hsla(${hue}, 50%, 50%, 1)`;
    } else {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
    }
    const [rayX, rayY] = rayPoint;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(rayX, rayY);
    ctx.stroke();
    i++;
  }
  ctx.restore();
}

function renderPolygonLines(polygonLines: Line[]): void {
  ctx.save();
  ctx.strokeStyle = '#fff';
  for (const line of polygonLines) {
    const [startPoint, endPoint]: [Point, Point] = line;
    ctx.beginPath();
    ctx.moveTo(...startPoint);
    ctx.lineTo(...endPoint);
    ctx.stroke();
  }
  ctx.restore();
}

const centerPoint: Point = [~~(widthPx * .5), ~~(heightPx * .5)];
const startPoint: Point = [~~(widthPx * .75), ~~(heightPx * .25)];
const endPoint: Point = [~~(widthPx * .25), ~~(heightPx  * .75)];
let frame = 0;
function render(time: number): void {
  frame++;
  const boundaryLines = [
    [[0, 0], [widthPx, 0]],
    [[widthPx, 0], [widthPx, heightPx]],
    [[0, heightPx], [widthPx, heightPx]],
    [[0, heightPx], [0, 0]],
  ];
  const vertices = 3;
  const angleTransform = time / (vertices * 2**9.25);
  const triangleLines: Line[] = getPolygonLines(centerPoint, vertices, Math.min(widthPx, heightPx) * .25, angleTransform);
  const obstacleLines = [].concat(boundaryLines, triangleLines);
  const startStar: Star = getStarFromPoint(startPoint, rayCount, obstacleLines, endPoint);
  const expandedStars: Star[] = expandStars([startStar], depth, obstacleLines, endPoint);
  ctx.clearRect(0, 0, widthPx, heightPx);
  renderPolygonLines(triangleLines);
  for (const star of expandedStars) {
    renderStar(star, `hsla(90, 50%, 50%, .5)`);
  }
  renderPoint(startPoint);
  renderPoint(endPoint);
  renderDebug({
    stars: expandedStars.length,
    rays: expandedStars.reduce((sum, cur) => sum + cur[1].length, 0),
    maxRaysPerStar: rayCount,
    depth: depth,
    fps: ~~((frame/time) * 1000),
  });
  window.requestAnimationFrame(render);
}
render(0);

canvasElement.addEventListener('mousemove', (event) => {
  startPoint[0] = clamp(event.clientX, 1, widthPx - 1);
  startPoint[1] = clamp(event.clientY, 1, heightPx - 1);
});
window.addEventListener('mousewheel', (event: WheelEvent) => {
  rayCount = clamp(
    (Math.sign(event.deltaY!) < 0 ? rayCount * 2 : rayCount * .5),
    4,
    128
  );
});
window.addEventListener('resize', () => {
  widthPx = window.innerWidth;
  heightPx = window.innerHeight;
  canvasElement.width = widthPx;
  canvasElement.height = heightPx;
});
