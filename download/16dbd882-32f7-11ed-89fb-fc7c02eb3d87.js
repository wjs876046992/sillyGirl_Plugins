/**
* @author https://t.me/sillyGirl_Plugin
* @version v1.0.0
* @create_at 2022-09-19 15:06:22
* @description nark对接，默认禁用,可填写默认上车服务器
* @title nark登陆
* @rule 登陆|登录
* @rule raw [\S ]+?pin=[^;]+; wskey=[^;]+;[\S ]+
* @rule raw [\S ]+?pt_key=[^;]+; pt_pin=[^;]+;[\S ]+
 * @public false
* @disable false
*/

//默认上车服务器序号
const DefaultQL=1

const ql=require("qinglong")

function main(){
	const s = sender
	const sillyGirl=new SillyGirl()
	var env={
		name:"",
		value:"",
		remarks:""
	}
	if(s.getContent()=="登陆"||s.getContent()=="登录"){
		const WAIT=60*1000
		const nark=(new Bucket("jd_cookie")).get("nolan_addr")
		if(nark==""){
			s.reply("未对接登陆，请联系管理员")
			return
		}

		var handle=function (s){
			 s.recallMessage(s.getMessageId())
		}
	
		s.reply("请输入电话号码：")
		let inp1=s.listen(handle,WAIT)
		if(inp1==null){
			s.reply("输入超时，请重新登陆")
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
		data=Submit_Nark(nark+"/api/VerifyCode",{
 					"Phone": Tel,
 					"QQ": "",
 					"qlkey": 0,
  					"Code": inp2.getContent()
				})
		if(!data.success){
			s.reply(data.message)
			return
		}
		env.name="JD_COOKIE"
		env.value=data.message
	}
	else if(s.getContent().indexOf(wskey)!=-1){
		env.name="JD_WSK"
		env.value=s.getContent().match(/pin=[^;]+; wskey=[^;]+;/)[0]
	}
	else{
		env.name="JD_COOKIE"
		env.value=s.getContent().match(/pt_key=[^;]+; pt_pin=[^;]+;/)[0]
	}
	
	let QLS=JSON.parse((new Bucket("qinglong")).get("QLS"))
	let ql_token=ql.Get_QL_Token(QLS[DefaultQL-1].host,QLS[DefaultQL-1].client_id,QLS[DefaultQL-1].client_secret)
	if(!ql_token){
		s.reply("token获取失败，请联系管理员")
		s.reply(env.value)
		return
	}
	if(SubmitJD(QLS[DefaultQL-1].host,ql_token,env)){
			let pin=env.value.match(/(?<=pin=)[^;]+/)[0]
			let imType=s.getPlatform()
			let bind=new Bucket("pin"+imType.toUpperCase())
			bind.set(pin,s.getUserId())
			sillyGirl.notifyMasters(pin+",已更新账号")
			s.reply("上车成功")
	}
	else{
		s.reply("提交失败，请联系管理员")
		s.reply(env.value)
		return

	}
}

function Submit_Nark(api,body){
	const TRY_TIMES=3
	let count=0
	let msg=""
	while(count<TRY_TIMES){
		count++
		let resp=request({
   			url:api,
    		method:"post",
			body:body
		})
		let data=JSON.parse(resp.body)
		if(data.success)
			break
		else if(data.message)
			msg=data.message
		else if(data.data.ck)
			msg=data.data.ck
		sleep(1000)
	}
	if(count==TRY_TIMES){
		if(err)
			return {success:false,message:msg}
		else
			return {success:false,message:"网络错误"}
	}
	else
		return {success:true,message:msg}
}

function SubmitJD(host,token,env){
	let envs=ql.Get_QL_Envs(host,token)
	if(envs==null)
		return false
	let pin=env.value.match(/(?<=pin=)[^;]+/)[0]
	let index=envs.findIndex(Ele=>Ele.name==env.name&&Ele.value.match(/(?<=pin=)[^;]+/)[0]==pin)
	if(index==-1)
		return ql.Add_QL_Env(host,token,env)
	else{
		if(typeof(envs[index].id)=="number")
			return ql.Update_QL_Env(host,token,envs[index].id,env.name,env.value,envs[index].remarks)
		else
			return ql.Update_QL_Env(host,token,envs[index]._id,env.name,env.value,envs[index].remarks)
	}
}

main()