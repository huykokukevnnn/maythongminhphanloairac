async function main() {
  const res = await fetch('https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/model.json');
  const json = await res.json();
  console.log(JSON.stringify(json.weightsManifest[0].paths, null, 2));
}
main();
