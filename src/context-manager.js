const fs = require('fs')

class ContextManagerClass {

	get_all_contexts(){
		return JSON.parse(fs.readFileSync('contexts.json'))
	}

	save_all_contexts(contexts){
		console.log("saving: " + JSON.stringify(contexts, null, 2))
		fs.writeFileSync('contexts.json', JSON.stringify(contexts))
	}

	add_channel(channel_uid, user_uid){
		var contexts = this.get_all_contexts()
		var userContext = contexts.find((context) => context.user === user_uid)
		if(userContext === undefined){
			contexts.push({
				"user": user_uid,
				"channel_contexts": [{
					"channel": channel_uid,
			        "user_context": {
			        	"admin": user_uid,
			        	"members": [
			            	user_uid
			          	],
			          	"active_votes": [],
			          	"contextChain": {
			          		"admin": user_uid,
			          		"members": [
				            	user_uid
				          	],
				          	"supporting_vote": undefined,
				          	"supporting_vote_key": undefined,
				          	"previous_chain": undefined
			          	}
			        }
				}]
			})
		}
		else{
			userContext.channel_contexts.push({
				"channel": channel_uid,
		        "user_context": {
		        	"admin": user_uid,
		        	"members": [
		            	user_uid
		          	],
		          	"active_votes": [],
		          	"contextChain": {
		          		"admin": user_uid,
		          		"members": [
			            	user_uid
			          	],			          	
			          	"supporting_vote": undefined,
			          	"supporting_vote_key": undefined,
			          	"previous_chain": undefined
		          	}
		        }
			})
		}
		this.save_all_contexts(contexts)
	}

	add_user(channel_uid, user_uid, author_uid){
		var contexts = this.get_all_contexts()
		var authorContext = this.get_user_context_channel_context_with_contexts_defined(contexts, channel_uid, author_uid)
		if(authorContext !== undefined){
			if(!authorContext.user_context.members.includes(user_uid)){
				authorContext.user_context.members.push(user_uid)
				var prevChain = JSON.parse(JSON.stringify(authorContext.user_context.contextChain))
				authorContext.user_context.contextChain = {
					"admin": authorContext.user_context.admin,
					"members": authorContext.user_context.members,
					"supporting_vote": undefined,//TODO add this
					"supporting_vote_key": author_uid,
					"previous_chain": prevChain
				}
				var newMemberContext = this.get_user_context_channel_context_with_contexts_defined(contexts, channel_uid, user_uid)
				if(newMemberContext === undefined){
					newMemberContext = contexts.find((context) => context.user === user_uid)
					if(newMemberContext === undefined){
						contexts.push({
							"user": user_uid,
							"channel_contexts": [{
								"channel": channel_uid,
						        "user_context": JSON.parse(JSON.stringify(authorContext.user_context))
							}]
						})
					}
					else{
						var channelContext = newMemberContext.channel_contexts.find((channel) => channel.channel === channel_uid)
						if(channel_contexts === undefined){
							newMemberContext.channel_contexts.push({
								"channel": channel_uid,
						        "user_context": JSON.parse(JSON.stringify(authorContext.user_context))
							})
						}						
					}
				}
			}
			this.get_relevant_user_contexts(contexts, channel_uid, author_uid).forEach((userContext) => {
				//TODO replace with chain verification
				var isAdminMatch = userContext.user_context.admin === authorContext.user_context.admin
				var membersDiff = userContext.user_context.members
					.filter(member => !authorContext.user_context.members.includes(member))
					.concat(authorContext.user_context.members.filter(member => !userContext.user_context.members.includes(member)))
				if(isAdminMatch && membersDiff.length === 1 && membersDiff[0] === user_uid && authorContext.user_context.members.includes(user_uid)){
					userContext.user_context = JSON.parse(JSON.stringify(authorContext.user_context))					
				}
			})
		}
		this.save_all_contexts(contexts)
	}

	delete_user(channel_uid, user_uid, author_uid){
		var contexts = this.get_all_contexts()
		var authorContext = this.get_user_context_channel_context_with_contexts_defined(contexts, channel_uid, author_uid)
		if(authorContext !== undefined){
			if(authorContext.user_context.members.includes(user_uid)){
				authorContext.user_context.members = authorContext.user_context.members.filter((member) => member !== user_uid)
				var prevChain = JSON.parse(JSON.stringify(authorContext.user_context.contextChain))
				authorContext.user_context.contextChain = {
					"admin": authorContext.user_context.admin,
					"members": authorContext.user_context.members,
					"supporting_vote": undefined,//TODO add this
					"supporting_vote_key": author_uid,
					"previous_chain": prevChain
				}
				this.get_relevant_user_contexts(contexts, channel_uid, author_uid).forEach((userContext) => {
					//TODO replace with chain verification
					var isAdminMatch = userContext.user_context.admin === authorContext.user_context.admin
					var membersDiff = userContext.user_context.members
						.filter(member => !authorContext.user_context.members.includes(member))
						.concat(authorContext.user_context.members.filter(member => !userContext.user_context.members.includes(member)))
					if(isAdminMatch && membersDiff.length === 1 && membersDiff[0] === user_uid && userContext.user_context.members.includes(user_uid)){
						userContext.user_context = JSON.parse(JSON.stringify(authorContext.user_context))
					}
				})
			}			
		}
		this.save_all_contexts(contexts)
	}

	change_admin(channel_uid, user_uid, author_uid){
		var contexts = this.get_all_contexts()
		var authorContext = this.get_user_context_channel_context_with_contexts_defined(contexts, channel_uid, author_uid)
		if(authorContext !== undefined){
			if(authorContext.user_context.members.includes(user_uid)){
				authorContext.user_context.admin = user_uid
				var prevChain = JSON.parse(JSON.stringify(authorContext.user_context.contextChain))
				authorContext.user_context.contextChain = {
					"admin": authorContext.user_context.admin,
					"members": authorContext.user_context.members,
					"supporting_vote": undefined,//TODO add this
					"supporting_vote_key": author_uid,
					"previous_chain": prevChain
				}
				this.get_relevant_user_contexts(contexts, channel_uid, author_uid).forEach((userContext) => {
					//TODO replace with chain verification
					var isAdminMatch = userContext.user_context.admin === authorContext.user_context.admin
					var membersDiff = userContext.user_context.members
						.filter(member => !authorContext.user_context.members.includes(member))
						.concat(authorContext.user_context.members.filter(member => !userContext.user_context.members.includes(member)))
					if(!isAdminMatch && membersDiff.length === 0){
						userContext.user_context = JSON.parse(JSON.stringify(authorContext.user_context))
					}
				})
			}			
		}
		this.save_all_contexts(contexts)
	}

	change_users_user_context(channel_uid, user_uid, user_context){
		var contexts = this.get_all_contexts()
		var authorContext = contexts.find((context) => context.user === user_uid)
		var success = false
		if(authorContext !== undefined){
			var channelContext = authorContext.channel_contexts.find((channel) => channel.channel === channel_uid)
			if(channelContext !== undefined){
				channelContext.user_context = user_context
				success = true
			}
		}
		this.save_all_contexts(contexts)
		return success
	}

	change_users_user_context_add_member(channel_uid, user_uid, author_uid){
		var currentUserContext = this.get_user_context(channel_uid, author_uid)
		if(currentUserContext !== undefined && !currentUserContext.members.includes(user_uid)) {
			currentUserContext.members.push(user_uid)
			return this.change_users_user_context(channel_uid, author_uid, currentUserContext)
		}
		return false
	}

	change_users_user_context_remove_member(channel_uid, user_uid, author_uid){
		var currentUserContext = this.get_user_context(channel_uid, author_uid)
		if(currentUserContext !== undefined && currentUserContext.members.includes(user_uid)) {
			currentUserContext.members = currentUserContext.members.filter((member) => member !== user_uid)
			return this.change_users_user_context(channel_uid, author_uid, currentUserContext)
		}
		return false
	}

	change_users_user_context_change_admin(channel_uid, user_uid, author_uid){
		var currentUserContext = this.get_user_context(channel_uid, author_uid)
		if(currentUserContext !== undefined){
			currentUserContext.admin = user_uid
			return this.change_users_user_context(channel_uid, author_uid, currentUserContext)
		}
		return false
	}

	get_relevant_user_contexts(contexts, channel_uid, author_uid){
		var authorContext = this.get_user_context_channel_context_with_contexts_defined(contexts, channel_uid, author_uid)
		if(authorContext !== undefined){
			var toReturn = []
			authorContext.user_context.members.forEach((member) => {
				var memberContext = this.get_user_context_channel_context_with_contexts_defined(contexts, channel_uid, member)
				if(memberContext !== undefined && member !== author_uid){
					toReturn.push(memberContext)
				}
			})
			console.log("Relevant Contexts are: " + JSON.stringify(toReturn))
			return toReturn
		}
		return []
	}

	get_user_context(channel_uid, user_uid){
		var contexts = this.get_all_contexts()
		return this.get_user_context_channel_context_with_contexts_defined(contexts, channel_uid, user_uid).user_context
	}

	get_user_context_channel_context_with_contexts_defined(contexts, channel_uid, user_uid){
		var userContext = contexts.find((context) => context.user === user_uid)
		if(userContext !== undefined){
			var channelContext = userContext.channel_contexts.find((channel) => channel.channel === channel_uid)
			if(channelContext !== undefined){
				return channelContext
			}
		}
		return undefined
	}

}

const ContextManager = new ContextManagerClass()

module.exports = ContextManager;
