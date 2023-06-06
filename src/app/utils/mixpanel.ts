import Mixpanel from 'mixpanel'
import config from './config'
const { MIXPANEL_TOKEN } = config
const mixpanel = Mixpanel.init(MIXPANEL_TOKEN!)

interface TrackUserSignupProps {
    userId: string
    workspace: string
    email: string
    name: string
    role: string
    phone: string

}

interface TrackArtistCreatedProps {
    workspace: string
    id: string
    label ?: string
    artistName: string
    signDate ?: Date
}

const trackUserSIgnup = (props: TrackUserSignupProps) => {
    const { userId, workspace, email, name, role, phone } = props
    // track user signup
    if (role === 'super_admin' || role === 'main_super_admin') {
        mixpanel.track('Super Admin Signup', {
            distinct_id: userId,
            email,
            name,
            role,
        });
        return
    }
    // set user properties 
    mixpanel.people.set(userId, {
        $group_key: ['Workspace', workspace],
        $group_id: workspace,
        $name: name,
        $email: email,
        $phone: phone,
        $role: role,
        $created: new Date()
    });

    mixpanel.track('User Signup', {
        distinct_id: userId,
        $group_key: ['Workspace', workspace],
        $group_id: workspace,
        $name: name,
        $email: email,
        $phone: phone,
        $role: role,
        $created: new Date()
    });

}

// add user to group
const addUsersToGroup = (props : TrackUserSignupProps) => {
    const { userId, workspace, email, name, role, phone } = props
    mixpanel.people.set(userId, {
        $group_key: ['Workspace', workspace],
        $group_id: workspace,
        $created: new Date(),
        $name: name,
        $email: email,
        $phone: phone,
        $role: role,
    });
}

// artist created
const artistCreatedEvent = (props: TrackArtistCreatedProps) => {
    const { workspace, id, label, artistName, signDate } = props
    mixpanel.track('Artist Created', {
        distinct_id: id,
        $group_key: ['Workspace', workspace],
        $group_id: workspace,
        $artist_name: artistName,
        $label: label,
        $sign_date: signDate,
        $created: new Date()
    });
}

export {
    trackUserSIgnup,
    addUsersToGroup,
    artistCreatedEvent
}
