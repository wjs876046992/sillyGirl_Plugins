/**
* @author https://t.me/sillyGirl_Plugin
* @version v1.0.5
* @create_at 2022-09-19 15:06:22
* @description nark对接，默认禁用，可修改默认上车容器,需安装qinglong模块
* @title nark登陆
* @rule raw ^(登陆|登录)$
* @rule raw [\S ]*pin=[^;]+; ?wskey=[^;]+;[\S ]*
* @rule raw [\S ]*pt_key=[^;]+; ?pt_pin=[^;]+;[\S ]*
* @priority 99999999999999999999
 * @public false
* @disable false
*/

//默认上车青龙容器序号
const DefaultQL=1

//允许上车的群聊白名单id,非白名单群禁止上车
const GroupWhiteList=[758657899]

//客户黑名单，黑名单客户禁止上车
const BlackList=[]

const ql=require("qinglong")
const s = sender
const sillyGirl=new SillyGirl()

function main(){

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
		env.name="JD_COOKIE"
		if(nark==""){
			if(s.isAmdin())
				s.reply("请使用命令set jd_cookie nolan_addr http://xx.xx.xx.xx 对接nark")
			else
				s.reply("未对接登陆，请联系管理员")
			return
		}

		var handle=function(s){s.recallMessage(s.getMessageId())}
	
		s.reply("请输入京东登陆手机号码(输入q退出)：")
		let inp=s.listen(handle,WAIT)
		if(inp==null){
			s.reply("输入超时，请重新登陆")
			return
		}
		else if(inp.getContent()=="q"){
			s.reply("已退出")
			return
		}
		else if(inp.getContent().length!=11){
			s.reply("手机号码错误，请重新登陆")
			return
		}
		let tipid=s.reply("请稍候...")
		let Tel=inp.getContent()
		let resp=request({
   			url:nark+"/api/SendSMS",
    		method:"post",
			body:{"Phone": Tel,"qlkey": 0}
		})
		s.recallMessage(tipid)
		try{
			let data=JSON.parse(resp.body)
			if(!data.success)
				throw("unsuccess")
		}
		catch(err){
			console.log(JSON.stringify(resp))
			s.reply("登陆暂时不可用,已自动为您通知管理员")
			sillyGirl.notifyMasters("报告管理员，客户登陆失败，nark疑似寄了")
			return
		}


		const VerifyTimes=3
		for(let i=0;i<VerifyTimes;i++){
			s.reply("请输入验证码：")
			inp=s.listen(handle,WAIT)
			if(inp==null){
				continue
			}
			if(inp.getContent().length!=6){
				s.reply("验证码错误，请重新输入")
				continue
			}
			resp=request({
   				url:nark+"/api/VerifyCode",
    			method:"post",
				body:{
 					"Phone": Tel,
 					"QQ": "",
 					"qlkey": 0,
  					"Code": inp.getContent()
				}
			})
			try{
				let data=JSON.parse(resp.body)
				if(!data.success){
					if(data.data.status==555 && data.data.mode=="USER_ID"){
						s.reply("您的账号需验证身份,请输入你的身份证前2位与后4位")
						for(j=0;j<VerifyTimes;j++){
							inp=s.listen(handle,WAIT)
							if(inp == null)
								continue
							resp=request({
   								url:nark+"/api/VerifyCardCode",
    							method:"post",
								body:{
  									"Phone": Tel,
  									"QQ": "",
  									"qlkey": 0,
  									"Code": inp.getContent()
								}
							})
							let data3=JSON.parse(resp.body)
							if(data3.success){
								env.value=data3.data.ck
								break
							}
							else if(data3.message){
								s.reply(data3.message+"，请重新输入")
							}
							else{
								s.reply("未知情况，请联系管理员")
								console.log(JSON.stringify(resp))
								break
							}
						}
					}
					else if(data.data.status==555 && data.data.mode=="HISTORY_DEVICE"){
						s.reply("您的账号需验证设备，请联系管理员")
						sillyGirl.notifyMasters(s.platform()+":"+s.getUserId()+"\n登陆失败，需进行设备验证，请联系开发者")
					}
					else if(data.message){
						s.reply(data.message+",请重新输入")
					}
				}
				else{
					env.value=data.data.ck
				}
				if(env.value)
					break
			}
			catch(err){
				s.reply("未知错误,请联系管理员："+err)
			}
			sleep(3000)
		}
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
	
	result=Submit_QL(QLS[DefaultQL-1].host,ql_token,env)
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
			s.reply("获取的ck已私聊推送给您，或者您可以稍后将ck发给机器人尝试再次提交")
		}
		return
	}
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