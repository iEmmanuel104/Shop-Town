export function modifyString(input: string): string {
    // Remove all spaces and replace them with underscores
    const modifiedString = input.replace(/ /g, '_');

    // Generate a random 6-digit number
    const randomCode = Math.floor(Math.random() * 900000) + 100000;

    // Attach the random code to the end of the modified string
    return `${modifiedString}_${randomCode}`;
}