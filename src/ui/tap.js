// «Честное» нажатие: срабатывает, только если палец опустился на объект, когда экран
// уже принимает ввод (isReady), и поднялся на этом же объекте. Палец, который держали
// на джойстике до появления экрана, при отпускании ничего не нажмёт.
// obj должен быть интерактивным (setInteractive).
export function onTap(obj, isReady, cb) {
  let armed = false;
  obj.on('pointerdown', () => (armed = isReady()));
  obj.on('pointerout', () => (armed = false));
  obj.on('pointerup', () => {
    const fire = armed && isReady();
    armed = false;
    if (fire) cb();
  });
}
