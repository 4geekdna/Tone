class CJCopy extends AudioWorkletProcessor{
  process(inputs,outputs){
    let input=inputs[0]||[],output=outputs[0]||[];
    for(let c=0;c<output.length;c++){
      let dst=output[c];
      if(!dst)continue;
      let src=input[c]||input[0];
      if(src&&src.length)dst.set(src.subarray(0,dst.length));
      else dst.fill(0);
    }
    return true;
  }
}
registerProcessor("cj-copy",CJCopy);
