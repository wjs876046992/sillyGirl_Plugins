/**
* @author https://t.me/sillyGirl_Plugin
 * @version v1.0.3
* @create_at 2022-09-19 15:06:22
* @description nark对接，默认禁用，可修改默认上车容器,需安装qinglong模块
* @title nark登陆
* @rule raw ^(登陆|登录)$
* @rule raw [\S ]*pin=[^;]+; ?wskey=[^;]+;[\S ]*
* @rule raw [\S ]*pt_key=[^;]+; ?pt_pin=[^;]+;[\S ]*
* @priority 999999
 * @public false
* @disable true
*/

//默认上车服务器序号
const DefaultQL=1

//允许上车的群聊白名单id,非白名单群禁止上车
const GroupWhiteList=[758657899]

//客户黑名单，黑名单客户禁止上车
const BlackList=[]

const ql=require("qinglong")

function main(){
	const s = sender
	const sillyGirl=new SillyGirl()

	if(BlackList.indexOf(s.getUserId())!=-1){
		s.reply("您已被拉黑，请联系管理员")
		return
	}
	else if(s.getChatId() && GroupWhiteList.indexOf(s.getChatId())==-1){
		s.reply("本群禁止上车")
		return
	}

	var env={
		name:"",
		value:"",
		remarks:""
	}
	if(s.getContent()=="登陆"||s.getContent()=="登录"){
		const WAIT=60*1000
		const nark=(new Bucket("jd_cookie")).get("nolan_addr")
		if(nark==""){
			if(s.isAmdin())
				s.reply("请使用命令set jd_cookie nolan_addr http://xx.xx.xx.xx 对接nark")
			else
				s.reply("未对接登陆，请联系管理员")
			return
		}

		var handle=function(s){s.recallMessage(s.getMessageId())}
	
		s.reply("请输入京东登陆手机号码(输入q退出)：")
		let inp1=s.listen(handle,WAIT)
		if(inp1==null){
			s.reply("输入超时，请重新登陆")
			return
		}
		else if(inp1.getContent()=="q"){
			s.reply("已退出")
			return
		}
		else if(inp1.getContent().length!=11){
			s.reply("手机号码错误，请重新登陆")
			return
		}
		let Tel=inp1.getContent()
		let data=Submit_Nark(nark+"/api/SendSMS",{"Phone": Tel,"qlkey": 0})
		if(!data.success){
			s.reply(data.message)
			return
		}
		
		s.reply("请输入验证码：")
		let inp2=s.listen(handle,WAIT)
		if(inp2==null){
			s.reply("输入超时，请重新登陆")
			return null
		}
		if(inp2.getContent().length!=6){
			s.reply("验证码错误，请重新登陆")
			return
		}
		data=Submit_Nark(nark+"/api/VerifyCode",{
 					"Phone": Tel,
 					"QQ": "",
 					"qlkey": 0,
  					"Code": inp2.getContent()
				})
		if(!data.success){
			console.log(data)
			s.reply(data.message)
			return
		}
		env.name="JD_COOKIE"
		env.value=data.message
	}
	else if(s.getContent().indexOf("wskey")!=-1){
		s.recallMessage(s.getMessageId())
		env.name="JD_WSCK"
		env.value=s.getContent().match(/pin=[^;]+; ?wskey=[^;]+;/)[0]
	}
	else{
		s.recallMessage(s.getMessageId())
		env.name="JD_COOKIE"
		env.value=s.getContent().match(/pt_key=[^;]+; ?pt_pin=[^;]+;/)[0]
	}
	console.log(JSON.stringify(env))

	let QLS=JSON.parse((new Bucket("qinglong")).get("QLS"))
	let ql_token=ql.Get_QL_Token(QLS[DefaultQL-1].host,QLS[DefaultQL-1].client_id,QLS[DefaultQL-1].client_secret)
	if(!ql_token){
		s.reply("token获取失败，请联系管理员")
		s.reply(env.value)
		return
	}
	let result=Submit_QL(QLS[DefaultQL-1].host,ql_token,env)
	//console.log(typeof(result)+":"+result)
	if(result){
		let pin=env.value.match(/(?<=pin=)[^;]+/).toString()
		let bind=new Bucket("pin"+s.getPlatform().toUpperCase())
		bind.set(pin,s.getUserId())
		if(result==1)
			sillyGirl.notifyMasters(pin+",已添加账号\n--来自["+s.getPlatform()+":"+s.getUserId()+"]")
		else if(result==2)
			sillyGirl.notifyMasters(pin+",已更新账号\n--来自["+s.getPlatform()+":"+s.getUserId()+"]")
		s.reply("上车成功")
	}
	else{
		s.reply("提交失败，请联系管理员")
		if(s.getContent()=="登陆"||s.getContent()=="登录"){
			sillyGirl.push({
    			platform: s.getPlatform(),
    			userId: s.getUserId(),
    			content: env.value,
			})
			s.reply("获取的ck已私聊推送给您，或者您可以尝试将ck发给机器人尝试再次提交")
		}
		return
	}
}

function Submit_Nark(api,body){
	const TRY_TIMES=5
	let count=0
	let msg=null
	while(count<TRY_TIMES){
		let resp=request({
   			url:api,
    		method:"post",
			body:body
		})
		let data=JSON.parse(resp.body)
		if(data.success){
			if(data.data.ck)
				msg=data.data.ck
			break
		}
		else if(data.message)
			msg=data.message
		else
			msg=JSON.stringify(data)
		count++
		sleep(5000)
	}
	if(count==TRY_TIMES){
		return {success:false,message:msg}
	}
	else
		return {success:true,message:msg}
}

function Submit_QL(host,token,env){
	let pin=env.value.match(/(?<=pin=)[^;]+/)
	if(pin==null)
		return false
	else
		pin=pin[0]
	let envs=ql.Get_QL_Envs(host,token)
	if(envs==null)
		return false
	
	let index=envs.findIndex(Ele => Ele.name == env.name && Ele.value.match(/(?<=pin=)[^;]+/)[0] == pin)
	if(index==-1){
		env.remarks=s.getPlatform()+":"+s.getUserId()
		if(ql.Add_QL_Env(host,token,[env]))
			return 1
		else
			return 0
	}
	else{
		if(envs[index].id)
			id=envs[index].id
		else
			id=envs[index]._id
		if(envs[index].remarks)
			remarks=envs[index].remarks
		else
			remarks=s.getPlatform()+":"+s.getUserId()
		if(ql.Update_QL_Env(host,token,id,env.name,env.value,remarks))
			return 2
		else
			return 0
	}
}

main()