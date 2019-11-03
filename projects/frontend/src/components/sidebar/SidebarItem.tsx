import styled from "styled-components";

interface ISidebarItemProps {
	selected?: boolean;
}

export const SidebarItem = styled.div<ISidebarItemProps>`
	&{
		width: 100%;
		padding: 4px 12px;
		box-sizing: border-box;
		background-color: ${props => props.selected ? 'white' : 'transparent'};
	}

	&:hover, &:hover *{
		background-color: ${props => props.selected ? 'white' : '#61676b'};
		color: ${props => props.selected ? 'black' : 'white'};
		cursor: pointer;
	}

	&, & *{
		color: ${props => props.selected ? 'black' : '#b0b5b9'};
		font-size: 15px;
		width: 100%;
	}

	& a{
		display: block;
	}
`