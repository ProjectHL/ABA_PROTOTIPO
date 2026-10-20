using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text;
using System.Threading.Tasks;

// Process-scoped CLI adapter. No daemon/API proxy, credentials, persistence or logs.
public static class DockerLoopback {
  private const string Project="aba-reintegration-local";
  private static string Quote(string value) {
    var output=new StringBuilder("\"");int slashes=0;
    foreach(char ch in value) {
      if(ch=='\\'){slashes++;continue;}
      if(ch=='\"'){output.Append('\\',slashes*2+1);output.Append(ch);slashes=0;continue;}
      output.Append('\\',slashes);slashes=0;output.Append(ch);
    }
    output.Append('\\',slashes*2);output.Append('"');return output.ToString();
  }
  public static int Main(string[] args) {
    try {
      string real=Environment.GetEnvironmentVariable("ABA_REAL_DOCKER");
      string expected=System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Programs","DockerDesktop","resources","bin","docker.exe");
      if(String.IsNullOrEmpty(real)||!String.Equals(System.IO.Path.GetFullPath(real),System.IO.Path.GetFullPath(expected),StringComparison.OrdinalIgnoreCase)||!System.IO.File.Exists(real))throw new Exception("Verified real Docker path required");
      var forwarded=new List<string>(args);
      if(args.Length>0&&(args[0]=="create"||args[0]=="run")) {
        // EdgeRuntime has a distinct official create callsite (shared/functions/serve.ts).
        var valued=new HashSet<string>(new[]{"--name","--hostname","-e","--env","--env-file","--ulimit","-v","--volume","--volumes-from","--tmpfs","-p","--publish","--expose","--health-cmd","--health-interval","--health-timeout","--health-retries","--health-start-period","--restart","--security-opt","--add-host","--network","--network-alias","--label","--entrypoint","--user","--workdir"});
        var booleans=new HashSet<string>(new[]{"--rm","-i","--interactive","-d","--detach","--init"});
        var ports=new List<int>();string name=null;bool projectLabel=false;string network=null;
        for(int index=1;index<args.Length;index++) {
          string flag=args[index];if(!flag.StartsWith("-",StringComparison.Ordinal))break;
          if(booleans.Contains(flag))continue;
          if(!valued.Contains(flag)||index+1>=args.Length){string flagName=flag.Split('=')[0];string safeFlag=System.Text.RegularExpressions.Regex.IsMatch(flagName,"^--?[a-z-]{1,36}$")?flagName:"[withheld]";throw new Exception("Unknown create/run flag "+safeFlag+"; values withheld");}
          string value=args[++index];
          if(flag=="--name"){if(name!=null)throw new Exception("Duplicate name refused");name=value;}
          if(flag=="--label"&&value.StartsWith("com.supabase.cli.project=",StringComparison.Ordinal)){if(projectLabel||value!="com.supabase.cli.project="+Project)throw new Exception("Conflicting or duplicate project label refused");projectLabel=true;}
          if(flag=="--network"){if(network!=null)throw new Exception("Duplicate network refused");network=value;}
          if(flag=="-p"||flag=="--publish")ports.Add(index);
        }
        bool isolatedName=name!=null&&name.EndsWith("_"+Project,StringComparison.Ordinal);
        if(isolatedName!=projectLabel)throw new Exception("Project name/label mismatch; refused");
        if(isolatedName) {
          if(network!=Project)throw new Exception("Isolated network required");
          foreach(int index in ports) {
            string value=args[index];string[] fields=value.Split(':');
            bool alreadyLoopback=fields.Length==3&&fields[0]=="127.0.0.1";
            if(alreadyLoopback){value=value.Substring("127.0.0.1:".Length);fields=value.Split(':');}
            if(fields.Length!=2)throw new Exception("Unexpected explicit host or publish shape; refused");
            ushort host;ushort container;string[] protocol=fields[1].Split('/');
            if(!UInt16.TryParse(fields[0],out host)||host==0||!UInt16.TryParse(protocol[0],out container)||container==0||protocol.Length>2||(protocol.Length==2&&protocol[1]!="tcp"&&protocol[1]!="udp"))throw new Exception("Unexpected port binding; refused");
            forwarded[index]="127.0.0.1:"+value;
          }
        }
      }
      var command=new StringBuilder();foreach(string value in forwarded){if(command.Length>0)command.Append(' ');command.Append(Quote(value));}
      var info=new ProcessStartInfo(real,command.ToString());info.UseShellExecute=false;info.CreateNoWindow=true;
      info.RedirectStandardInput=true;info.RedirectStandardOutput=true;info.RedirectStandardError=true;
      using(var process=Process.Start(info)) {
        var output=Task.Factory.StartNew(delegate{process.StandardOutput.BaseStream.CopyTo(Console.OpenStandardOutput());});
        var error=Task.Factory.StartNew(delegate{process.StandardError.BaseStream.CopyTo(Console.OpenStandardError());});
        // The input pump is background; do not wait on an upstream pipe after Docker exits.
        Task.Factory.StartNew(delegate{try{Console.OpenStandardInput().CopyTo(process.StandardInput.BaseStream);}catch(System.IO.IOException){}finally{try{process.StandardInput.Close();}catch(ObjectDisposedException){}}});
        process.WaitForExit();Task.WaitAll(output,error);return process.ExitCode;
      }
    } catch(Exception problem) {string reason=problem.GetType()==typeof(Exception)?problem.Message:"Command refused or forwarding failed; values withheld";Console.Error.WriteLine("A1 Docker loopback adapter: "+reason);return 64;}
  }
}
