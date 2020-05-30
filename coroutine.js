// coroutine.js - A coroutine javascript implement

function IsGenerator(object)
{
  if (object == null)
  {
    return false;
  }
  return object.constructor === (function*(){}).prototype.constructor;
}

class YieldInstruction
{
  constructor()
  {
    this.callers = [];
    this.done = false;
    this.interrupted = false;
    this.argumentsQueue = [];
    this.error = undefined;
  }

  OnStarted() {}

  OnInterrupted() {}

  OnThown(error)
  {
    throw error;
  }

  Start(caller)
  {
    if (this.interrupted)
    {
      if (caller !== undefined)
      {
        caller.Interrupt(this.error);
      }
      return;
    }
    if (caller != null)
    {
      if (this.done)
      {
        caller.Start();
      }
      else
      {
        this.callers.push(caller);
      }
    }
    try
    {
      this.OnStarted();
    }
    catch (error)
    {
      this.Throw(error);
    }
    return this;
  }

  End()
  {
    if (this.interrupted)
    {
      return;
    }
    this.done = true;
    this.callers.forEach(caller => { caller.Start(); });
    this.callers = [];
  }

  Interrupt(error)
  {
    this.error = error;
    if (this.interrupted || this.done)
    {
      return;
    }
    this.interrupted = true;
    this.OnInterrupted()
    this.callers.forEach(caller => { caller.Interrupt(error); });
    var callerCount = this.callers.length;
    this.callers = [];
    if (callerCount == 0 && error !== undefined)
    {
      this.OnThown(error);
    }
  }

  Throw(error)
  {
    this.Interrupt(error);
  }
}

class WaitForSeconds extends YieldInstruction
{
  constructor(seconds)
  {
    super();
    this.seconds = seconds;
    this.timer = null;
  }

  OnStarted()
  {
    var milliseconds = this.seconds * 1000.0;
    this.timer = setTimeout($this => { $this.End();}, milliseconds, this);
  }

  OnInterrupted()
  {
    clearTimeout(this.timer);
    this.timer = null;
  }
}

function Callback()
{
  function callback(...args)
  {
    callback.yieldInstruction.argumentsQueue.push(args);
    if (callback.yieldInstruction.done)
    {
      callback.yieldInstruction.Throw(new Error("Multiple-call Callback object is unsupported."))
    }
    callback.yieldInstruction.End();
    return callback;
  }
  callback.yieldInstruction = new YieldInstruction();
  callback.__proto__ = Callback.prototype;
  return callback;
}

Callback.prototype = Object.create(Function.prototype);

class PromiseYieldInstruction extends YieldInstruction
{
  constructor(promise)
  {
    super();
    this.promise = promise;
  }

  OnStarted()
  {
    this.promise.then(() => this.End()).catch((error) => this.Throw(error));
  }
}

class Coroutine extends YieldInstruction
{
  constructor(generator)
  {
    super();
    this.generator = generator;
    this.callee = { argumentsQueue: [], Interrupt: (error) => {} };
    this.current = { done: false, };
  }

  OnStarted()
  {
    while (!this.current.done)
    {
      this.current = this.generator.next(this.callee.argumentsQueue[0]);
      var value = this.current.value;
      var yieldInstruction = ConvertToYieldInstruction(value);
      if (yieldInstruction != null)
      {
        this.callee = yieldInstruction;
      }
      else
      {
        continue;
      }
      this.callee.Start(this)
      return;
    }
    this.End();
  }

  OnInterrupted()
  {
    this.callee.Interrupt();
  }

  OnThown(error)
  {
    this.generator.throw(error);
  }
}

function ConvertToYieldInstruction(object)
{
  if (IsGenerator(object))
  {
    return new Coroutine(object);
  }
  else if (object instanceof YieldInstruction)
  {
    return object
  }
  else if (object instanceof Callback)
  {
    return object.yieldInstruction;
  }
  else if (object instanceof Promise)
  {
    return new PromiseYieldInstruction(object);
  }
  return null;
}

class Wait extends YieldInstruction
{
  constructor(object, seconds)
  {
    super();
    var yieldInstruction = ConvertToYieldInstruction(object);
    if (yieldInstruction == null)
    {
      this.Throw(new Error("Wait class constructor's first argument is not yieldable."));
    }
    this.yieldInstruction = yieldInstruction;
    var milliseconds = seconds * 1000.0;
    this.seconds = seconds;
    this.timer = setTimeout($this => { $this.OnTimeOut(); } , milliseconds, this);
  }

  OnStarted()
  {
    if (!this.yieldInstruction.done)
    {
      this.yieldInstruction.Start(this);
    }
    else
    {
      clearTimeout(this.timer);
      this.argumentsQueue.push(this.yieldInstruction.argumentsQueue[0]);
      this.End();
    }
  }

  OnTimeOut()
  {
    this.Throw(new Error("The running procedure is timeout. (Limited in " + this.seconds + "s)"))
  }
}

module.exports =
{
  Coroutine, YieldInstruction, WaitForSeconds, Callback, Wait,
}