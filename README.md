# coroutine.js

A coroutine javascript implement. Some Unity-like yieldable items are provided to make asynchronous programming more graceful.

# Feature & Example

The Callback object can be used to solve the well-known "callback hell", so that code can be written in a fully synchronized style. Example below shows an HTTP response:

```javascript
new Coroutine(function*()
{
  var callback = new Callback();
  request("https://github.com/9087/coroutine.js", callback);

  // the yield return value is the callback argument list
  var [error, message] = yield callback;
  
  // check error and do something with incoming message
}
()).Start();
```

Example of timeout control:

```javascript
new Coroutine(function*()
{
  try
  {
    console.log(new Date() + " -> Start");

    // wait for two seconds but timeout after one second
    yield new Wait(new WaitForSeconds(2.0), 1.0);
    
    console.log(new Date() + " -> End");
  }
  catch (error)
  {
    // the Wait object throw an error on timeout
    console.log(new Date() + " -> " + error);
  }
}
()).Start();
```

Interrupt a running coroutine:

```javascript
class WaitForSecondsWithInterruptLog extends WaitForSeconds
{
  OnInterrupted()
  {
    console.log(new Date() + " -> Interrupted");
  }
}

var example = new Coroutine(function*()
{
  console.log(new Date() + " -> Start");
  yield new WaitForSecondsWithInterruptLog(2.0);
  console.log(new Date() + " -> End");
}
());

example.Start();

new Coroutine(function*()
{
  yield new WaitForSeconds(1.0);
  example.Interrupt();
}
()).Start();

```

# Yieldable Items

Default yieldable items are listed below:

- Generator
- Coroutine
- Callback
- WaitForSeconds
- Wait
- Promise

Customize more YieldInstruction subclasses to support whatever you need. :)