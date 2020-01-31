const config = require("../config.json");
const tr = require("./task-runner");
const democracy = require("./democracy");
const contextManager = require("./context-manager");

const positiveResponses = [ "yes", "y", "no'nt", "yea", "sure"]
const negativeResponses = [ "no", "n", "yesn't", "nay"]
const commands = [ 	"(t) test",
					"(s) state",
					"(a) add-member [user] [role]",
					"(r) remove-member [user] [role]",
					"(p) change-admin [user] [role]",
					"(v) vote [yes/no] <user>",
					"(c) create-channel [role]",
					"(cv) cancel-vote",
					"(ucp) change-user-context-admin [user] [role]",
					"(uca) change-user-context-add-user [user] [role]",
					"(ucr) change-user-context-remove-user [user] [role]",
					"(ucv) view-user-context [user] [role]",
					"(rs) reset",
					"(d) sync-discord-roles [user] [role]"
				]

var voteInProgress = false;
var state = null;

function messageHandler(message) {
	if(message.author.bot) return;
	if(message.content.indexOf(config.prefix) !== 0) return;

	const args = message.content.slice(config.prefix.length).trim().split(/ +/g)
	const command = args.shift().toLowerCase()
	const channel = message.channel.name
	const author = message.author

	if (command === "test" || command === "t") {
		return message.reply("Status: OK")
	}

	else if (command === "state" || command === "s") {
		return message.reply(JSON.stringify(state, null, 2))
	}

	else if (command === "create-channel" || command === "c") {
		if(args[0] === undefined){
			return message.reply("Please provide a channel name");
		}
		contextManager.add_channel(args[0], author.id)
		tr.createChannel(message.guild, args[0])
		return message.reply("Created channel " + args[0])
	}

	else if (command === "add-member" || command === "a") {
		let member = message.mentions.members.first() || message.guild.members.get(args[0])
		let role = message.guild.roles.find(role => role.name === args[1])
		let channel = {
			"chid": role.name,
			"members": contextManager.get_user_context(role.name, author.id).members,
			"admin": contextManager.get_user_context(role.name, author.id).admin
		}
		if (!member) {
			return message.reply("Please mention a valid member of this server")
		}
		if(voteInProgress) {
			return message.reply("Error: A vote is already in progress.")
		}

		state = democracy.addUser(author, member, channel)
		voteInProgress = true
		return message.reply("Vote started to add member " + member.id)
	}

	else if (command === "remove-member" || command === "r") {
		let member = message.mentions.members.first() || message.guild.members.get(args[0])
		let role = message.guild.roles.find(role => role.name === args[1])
		let channel = {
			"chid": role.name,
			"members": contextManager.get_user_context(role.name, author.id).members,
			"admin": contextManager.get_user_context(role.name, author.id).admin
		}
		if (!member) {
			return message.reply("Please mention a valid member of this server")
		}
		if(voteInProgress) {
			return message.reply("Error: A vote is already in progress.")
		}

		state = democracy.removeUser(author, member, channel)
		voteInProgress = true
		return message.reply("Vote started to remove member " + member.id)
	}

	else if (command === "change-admin" || command === "p") {
		let member = message.mentions.members.first() || message.guild.members.get(args[0])
		let role = message.guild.roles.find(role => role.name === args[1])
		let channel = {
			"chid": role.name,
			"members": contextManager.get_user_context(role.name, author.id).members,
			"admin": contextManager.get_user_context(role.name, author.id).admin
		}
		if(!member) {
			return message.reply("Please mention a valid member of this server")
		}
		if(voteInProgress) {
			return message.reply("Error: A vote is already in progress.")
		}

		state = democracy.promoteUser(author, member, channel)
		voteInProgress = true
		return message.reply("Vote started to promote member" + member.id)
	}

	else if (command === "vote" || command === "v") {
		let actor = author
		let member = message.mentions.members.first()
		if(member) {
			actor = member
		}
		if(!voteInProgress) {
			return message.reply("There are no votes in progress.")
		}
		let role = message.guild.roles.find(role => role.name === state.channel.chid)
		let channel = {
			"chid": role.name,
			"members": contextManager.get_user_context(role.name, actor.id).members,
			"admin": contextManager.get_user_context(role.name, actor.id).admin
		}

		// invoke democracy vote
		var response = args[0]
		var vote;
		if(positiveResponses.contains(response)) {
			vote = true
		} else if (negativeResponses.contains(response)) {
			vote = false
		} else {
			return message.reply("Please vote yes or no.")
		}

		state = democracy.vote(actor, state, vote)

		if(state.error) {
			return message.reply("Error during voting: " + state.error)
		}

		message.reply("Vote counted. There are now " + state.yea.length + " votes for, and " + state.nay.length + " votes against. " + state.remain.length + " votes remain.")

		// if pass, execute command
		if(state.yea.length > state.nay.length + state.remain.length) {
			voteInProgress = false
			switch(state.action) {
				case "add":
					contextManager.add_user(channel.chid, state.target.id, actor.id)
					tr.addUser(state.target, role)
					return message.reply("Vote has passed, adding user " + state.target)
				case "remove":
					contextManager.delete_user(channel.chid, state.target.id, actor.id)
					tr.removeUser(state.target, role)
					return message.reply("Vote has passed, removing user " + state.target)
				case "promote":
					contextManager.change_admin(channel.chid, state.target.id, actor.id)
					tr.changeAdmin(state.target, role)
					return message.reply("Vote has passed, promoting user " + state.target)
				default:
					return message.reply("Vote has passed, but there was no action?")
			}
		}

		// if fail, announce fail
		if(state.nay.length > state.yea.length + state.remain.length) {
			voteInProgress = false
			return message.reply("Vote has failed. Nothing changes.")
		}
	}

	else if (command === "change-user-context-admin"  || command === "ucp") {
		let member = message.mentions.members.first() || message.guild.members.get(args[0])
		let role = message.guild.roles.find(role => role.name === args[1])
		if (!role) {
			return message.reply("The role does not exist or no role was provided")
		}
		if(contextManager.change_users_user_context_change_admin(role.name, member.id, author.id)){
			return message.reply("Successfully changed admin to user " + member.id)
		}
		return message.reply("Encountered error changing admin to user " + member.id)
	}

	else if (command === "change-user-context-add-member" || command === "uca") {
		let member = message.mentions.members.first() || message.guild.members.get(args[0])
		let role = message.guild.roles.find(role => role.name === args[1])
		if (!role) {
			return message.reply("The role does not exist or no role was provided")
		}
		if(contextManager.change_users_user_context_add_member(role.name, member.id, author.id)){
			return message.reply("Successfully added user " + member.id)
		}
		return message.reply("Encountered error adding user " + member.id)
	}

	else if (command === "change-user-context-remove-member" || command === "ucr") {
		let member = message.mentions.members.first() || message.guild.members.get(args[0])
		let role = message.guild.roles.find(role => role.name === args[1])
		if (!role) {
			return message.reply("The role does not exist or no role was provided")
		}
		if(contextManager.change_users_user_context_remove_member(role.name, member.id, author.id)){
			return message.reply("Successfully removed user " + member.id)
		}
		return message.reply("Encountered error removing user " + member.id)
	}

	else if (command === "view-user-context" || command === "ucv") {
		let member = message.mentions.members.first() || message.guild.members.get(args[0])
		let role = message.guild.roles.find(role => role.name === args[1])
		if (!role) {
			return message.reply("The role does not exist or no role was provided")
		}
		let currentUserContext = contextManager.get_user_context(role.name, member.id)
		if(!currentUserContext) {
			return message.reply("There is currently no context for that user and role")
		}
		return message.reply(JSON.stringify(currentUserContext, null, 2))
	}
	
	else if (command === "cancel-vote" || command === "cv") {
		state = null;
		voteInProgress = false;
		return message.reply("Vote cancelled.")
	}

	else if (command === "reset" || command === "rs") {
		contextManager.save_all_contexts([])
		tr.reset(message.guild)
	}

	else if (command === "sync-discord-roles" || command === "d") {
		let member = message.mentions.members.first() || message.guild.members.get(args[0])
		let role = message.guild.roles.find(role => role.name === args[1])
		if (!role) {
			return message.reply("The role does not exist or no role was provided")
		}
		tr.setStatus(message.guild, member, role).then((success) => {
			if(success){
				return message.reply("Channel roles have been synced")
			}
			return message.reply("Error syncing roles")
		})
	}
	
	else {
		var helpString = "Available commands:\n"
		commands.forEach((singleCmd) => helpString = helpString + singleCmd + "\n")
		return message.reply(helpString)
	}
}

module.exports.handleMessage = messageHandler;
