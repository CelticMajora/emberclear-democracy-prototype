const config = require('../config.json');
const Discord = require('discord.js');
const contextManager = require("./context-manager");
const client = new Discord.Client();

class TaskRunnerClass {

    constructor(){
        this.colors = [16711680, 65280, 255, 16776960, 65535, 16711935]
        this.availableColors = [16711680, 65280, 255, 16776960, 65535, 16711935]
    }

    createChannel(guild, roleName) {
        var promises = []
        var newRole = undefined
        if(this.availableColors.length !== 0){
            var color = this.availableColors[Math.floor(Math.random() * this.availableColors.length)]
            promises.push(guild.createRole({
                name: roleName,
                color: color
            }).then(role => newRole = role))
            promises.push(guild.createRole({
                name: "admin-" + roleName,
                color: color
            }))
            this.availableColors = this.availableColors.filter((colorNumber) => colorNumber !== color)
        }
        else{
            promises.push(guild.createRole({
                name: roleName
            }).then(role => newRole = role))
            promises.push(guild.createRole({
                name: "admin-" + roleName
            }))
        }        
        return Promise.allSettled(promises).then(() => newRole)
    }

    addUser(member, role) {
        console.log('Giving ' + role.name + ' discord role to ' + member.id)
        return member.addRole(role)
    }
    
    removeUser(member, role) {
        console.log('Removing ' + role.name + ' discord role to ' + member.id)
        return member.removeRole(role)
    }
    
    changeAdmin(guild, member, role) {
        const currentAdmin = guild.members.filter(member => member.roles.find(memberRole => memberRole === role) !== undefined)[0]
        var promises = []
        var adminRoleName = "admin-" + role.name
        var adminRole = guild.roles.find((guildRole) => guildRole.name === adminRoleName)
        if(adminRole !== undefined){
            if(currentAdmin) {
                promises.push(currentAdmin.removeRole(adminRole))
            }
            console.log('Giving admin ' + role.name + ' discord role to ' + member.id)
            promises.push(member.addRole(adminRole))
        }
        return Promise.allSettled(promises)
    }

    reset(guild) {
        console.log('clearing roles from ' + guild.name)
        var promises = []
        guild.roles.forEach((role) => {
            promises.push(role.delete().then(deleted => {
                if(this.colors.includes(deleted.color) && !this.availableColors.includes(deleted.color)){
                    this.availableColors.push(deleted.color)
                }
                console.log('deleted role ' + deleted.name)
            }))
        })
        return Promise.allSettled(promises)
    }

    setStatus(guild, member, role) {
        return this.reset(guild).then(() => {
            return this.createChannel(guild, role.name).then(newRole => {
                var userContext = contextManager.get_user_context(newRole.name, member.id)
                if(userContext !== undefined){
                    const admin = guild.members.find((member) => member.id === userContext.admin)
                    var promises = []
                    promises.push(this.changeAdmin(guild, admin, newRole))
                    userContext.members.forEach((member) => {
                        let memberObject = guild.members.find((specificMember) => specificMember.id === member)
                        promises.push(this.addUser(memberObject, newRole))
                    }) 
                    return Promise.allSettled(promises).then(() => true)
                }
                return Promise.resolve(false)
            })
        })
    }
}

const TaskRunner = new TaskRunnerClass()

module.exports = TaskRunner;
