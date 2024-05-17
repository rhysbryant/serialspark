/*
 Copyright (c) 2024 Rhys Bryant

 serialspark is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 serialspark is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with serialspark. If not, see <https://www.gnu.org/licenses/>.
 */

#ifndef PORT_MANAGER_H
#define PORT_MANAGER_H
#include "Port.h"
//Manages the Port instances  
class PortManager
{
public:
    static const Port ports[];
    static const int portCount;
    static const Port *requestOwnershipTakeover(const char *portName);
    static bool releaseOwnership(Port *port);

    static void init();

private:
    static int indexOfPort(const char *portName);
    static bool portLock[];
};

#endif